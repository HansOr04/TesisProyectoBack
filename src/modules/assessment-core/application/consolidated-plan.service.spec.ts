import { PrismaService } from '../../../shared/infrastructure/database/prisma.service';
import { ConsolidatedPlanService } from './consolidated-plan.service';

const d = (iso: string) => new Date(iso);

function indicatorMeasure(
  name: string,
  start: string,
  end: string,
  status: 'PENDING' | 'IN_PROGRESS' | 'DONE',
  progressPct: number,
  tool: string,
  profile: string,
) {
  return {
    name,
    startDate: d(start),
    endDate: d(end),
    status,
    progressPct,
    evaluation: { profile: { name: profile }, template: { tool } },
  };
}

function mitigationMeasure(
  description: string,
  start: string,
  end: string,
  status: 'PENDING' | 'IN_PROGRESS' | 'DONE',
  progressPct: number,
  profile: string,
) {
  return {
    description,
    startWeek: d(start),
    endDate: d(end),
    status,
    progressPct,
    risk: {
      evaluation: { profile: { name: profile }, template: { tool: 'RISK' } },
    },
  };
}

describe('ConsolidatedPlanService', () => {
  let service: ConsolidatedPlanService;
  let indicatorRows: ReturnType<typeof indicatorMeasure>[];
  let mitigationRows: ReturnType<typeof mitigationMeasure>[];

  beforeEach(() => {
    indicatorRows = [
      indicatorMeasure(
        'Manual de funciones',
        '2026-03-01',
        '2026-05-01',
        'DONE',
        100,
        'ORGANIZATIONAL',
        'Cacaoteros',
      ),
      indicatorMeasure(
        'Plan de capacitación',
        '2026-01-15',
        '2026-04-01',
        'IN_PROGRESS',
        50,
        'CAPACITY',
        'Cacaoteros',
      ),
      indicatorMeasure(
        'Costeo por lote',
        '2026-02-01',
        '2026-06-01',
        'PENDING',
        0,
        'ORGANIZATIONAL',
        'Selva Viva',
      ),
    ];
    mitigationRows = [
      mitigationMeasure(
        'Contrato de acopio',
        '2026-02-10',
        '2026-08-01',
        'IN_PROGRESS',
        40,
        'Cacaoteros',
      ),
    ];

    const prisma = {
      assessmentIndicatorMeasure: {
        findMany: jest.fn().mockImplementation(() => indicatorRows),
      },
      assessmentMitigationMeasure: {
        findMany: jest.fn().mockImplementation(() => mitigationRows),
      },
    } as unknown as PrismaService;
    service = new ConsolidatedPlanService(prisma);
  });

  it('reúne las dos tablas de medidas y las ordena por fecha de inicio', async () => {
    const rows = await service.measures('demo', { groupBy: 'profile' });

    expect(rows.map((r) => r.name)).toEqual([
      'Plan de capacitación',
      'Costeo por lote',
      'Contrato de acopio',
      'Manual de funciones',
    ]);
    // La de mitigación usa startWeek como fecha de inicio.
    expect(rows[2].startDate).toEqual(d('2026-02-10'));
  });

  it('agrupa por herramienta o por organización según el alcance', async () => {
    const byTool = await service.measures('demo', { groupBy: 'tool' });
    expect(new Set(byTool.map((r) => r.group))).toEqual(
      new Set(['Organizativa', 'Capacidades', 'Riesgos']),
    );

    const byProfile = await service.measures('demo', { groupBy: 'profile' });
    expect(new Set(byProfile.map((r) => r.group))).toEqual(
      new Set(['Cacaoteros', 'Selva Viva']),
    );
  });

  it('no arma Gantt propio en el alcance de una sola herramienta', async () => {
    await expect(service.gantt('demo', 'tool', 'p1')).resolves.toBeUndefined();
  });

  it('resume cada grupo en una barra: rango completo, avance promedio y estado', async () => {
    const gantt = await service.gantt('demo', 'project', 'p1');

    expect(gantt?.title).toContain('todo el proyecto');
    const cacaoteros = gantt?.measures.find((m) =>
      m.name.startsWith('Cacaoteros'),
    );
    // Tres medidas: 100 + 50 + 40 → 63 % de avance promedio.
    expect(cacaoteros).toMatchObject({
      name: 'Cacaoteros · 3 medidas',
      startDate: d('2026-01-15'),
      endDate: d('2026-08-01'),
      status: 'IN_PROGRESS',
      progressPct: 63,
    });

    // Un grupo con todo sin empezar sigue en pendiente.
    expect(
      gantt?.measures.find((m) => m.name.startsWith('Selva Viva')),
    ).toMatchObject({ status: 'PENDING', progressPct: 0 });
  });

  it('marca el grupo como concluido solo cuando todas sus medidas lo están', async () => {
    mitigationRows = [];
    indicatorRows = [
      indicatorMeasure(
        'Una',
        '2026-01-01',
        '2026-02-01',
        'DONE',
        100,
        'ORGANIZATIONAL',
        'Cacaoteros',
      ),
      indicatorMeasure(
        'Otra',
        '2026-01-05',
        '2026-03-01',
        'DONE',
        100,
        'CAPACITY',
        'Cacaoteros',
      ),
    ];

    const gantt = await service.gantt('demo', 'project', 'p1');
    expect(gantt?.measures[0]).toMatchObject({
      status: 'DONE',
      progressPct: 100,
    });
  });

  it('recorta el nombre del grupo, nunca el contador de medidas', async () => {
    indicatorRows = indicatorRows.map((row) => ({
      ...row,
      evaluation: {
        ...row.evaluation,
        profile: {
          name: 'Asociación de Productores Agroecológicos del Norte Andino',
        },
      },
    }));
    mitigationRows = [];

    const gantt = await service.gantt('demo', 'project', 'p1');
    const [bar] = gantt?.measures ?? [];
    // El Gantt recorta la etiqueta en 42 caracteres: debe caber entera.
    expect(bar.name.length).toBeLessThanOrEqual(42);
    expect(bar.name.endsWith('· 3 medidas')).toBe(true);
    expect(bar.name).toContain('…');
  });
});

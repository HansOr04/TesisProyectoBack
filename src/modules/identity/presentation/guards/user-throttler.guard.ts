import { Injectable } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import { AUTH_CONTEXT_KEY, AuthContext } from '../../domain/auth-context';

// Límite global de peticiones: por usuario con sesión y por IP sin ella (el
// inicio de sesión). Contado por IP, los evaluadores de un taller detrás del
// mismo router compartían 300 peticiones por minuto, y con 20 calificando a la
// vez una de cada cuatro calificaciones se rechazaba con 429. Se registra justo
// después de JwtAuthGuard para que la petición ya traiga el usuario.
@Injectable()
export class UserThrottlerGuard extends ThrottlerGuard {
  protected async getTracker(req: Record<string, any>): Promise<string> {
    const auth = req[AUTH_CONTEXT_KEY] as AuthContext | undefined;
    return auth ? `user:${auth.userId}` : req.ip;
  }
}

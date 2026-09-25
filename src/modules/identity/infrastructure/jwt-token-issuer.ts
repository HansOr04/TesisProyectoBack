import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { AccessTokenPayload } from '../domain/auth-context';
import { TokenIssuerPort } from '../domain/ports';

@Injectable()
export class JwtTokenIssuer implements TokenIssuerPort {
  constructor(private readonly jwtService: JwtService) {}

  sign(payload: AccessTokenPayload): Promise<string> {
    return this.jwtService.signAsync(payload);
  }

  verify(token: string): Promise<AccessTokenPayload> {
    return this.jwtService.verifyAsync<AccessTokenPayload>(token);
  }
}

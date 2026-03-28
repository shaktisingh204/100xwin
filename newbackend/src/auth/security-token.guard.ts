import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';

@Injectable()
export class SecurityTokenGuard implements CanActivate {
    canActivate(context: ExecutionContext): boolean {
        const request = context.switchToHttp().getRequest();
        const token = request.headers['x-admin-token'];
        const validToken = process.env.ADMIN_API_TOKEN;

        if (!validToken) {
            console.warn('ADMIN_API_TOKEN is not set in environment variables');
            return false;
        }

        if (token !== validToken) {
            throw new UnauthorizedException('Invalid security token');
        }

        return true;
    }
}

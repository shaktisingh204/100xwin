import { ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { IS_PUBLIC_KEY } from './public.decorator';
import { PrismaService } from '../prisma.service';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
    constructor(
        private reflector: Reflector,
        private prisma: PrismaService,
    ) {
        super();
    }

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
            context.getHandler(),
            context.getClass(),
        ]);
        if (isPublic) {
            return true;
        }

        // Run the standard JWT validation first
        const canActivate = await (super.canActivate(context) as Promise<boolean>);
        if (!canActivate) return false;

        // After JWT is valid, check if the user has been banned since login
        const request = context.switchToHttp().getRequest();
        const userId = request.user?.userId ?? request.user?.sub;

        if (userId) {
            const user = await this.prisma.user.findUnique({
                where: { id: userId },
                select: { isBanned: true },
            });

            if (user?.isBanned) {
                throw new UnauthorizedException('Your account has been suspended. Please contact support.');
            }
        }

        return true;
    }
}

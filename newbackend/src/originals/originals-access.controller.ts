import { Controller, Get, Req } from '@nestjs/common';
import { OriginalsAdminService } from './originals-admin.service';

@Controller('originals/access')
export class OriginalsAccessController {
  constructor(private readonly adminService: OriginalsAdminService) {}

  @Get('me')
  async getMyAccess(@Req() req: any) {
    const userId = Number(req.user?.userId);
    const allowed = Number.isInteger(userId) && userId > 0
      ? await this.adminService.canUserPlayOriginals(userId)
      : false;

    const config = await this.adminService.getAccessConfig();

    return {
      allowed,
      accessMode: config.accessMode ?? 'ALLOW_LIST',
      allowedUserIdsCount: Array.isArray(config.allowedUserIds) ? config.allowedUserIds.length : 0,
    };
  }
}

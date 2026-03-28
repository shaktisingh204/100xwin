import { Transform, Type } from 'class-transformer';
import { IsIn, IsNumber, IsOptional, IsString, MaxLength, Min } from 'class-validator';

const toTrimmedString = ({ value }: { value: unknown }) =>
  String(value ?? '').trim();

const toNormalizedBetType = ({ value }: { value: unknown }) =>
  String(value ?? '')
    .trim()
    .toLowerCase();

export class PlaceBetDto {
  @Transform(toTrimmedString)
  @IsString()
  @MaxLength(64)
  eventId: string;

  @Transform(toTrimmedString)
  @IsString()
  @MaxLength(128)
  marketId: string;

  @Transform(toTrimmedString)
  @IsString()
  @MaxLength(128)
  selectionId: string;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(1.01)
  odds: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(1.01)
  rate?: number;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(1)
  stake: number;

  @IsOptional()
  @Transform(toTrimmedString)
  @IsIn(['fiat', 'crypto'])
  walletType?: 'fiat' | 'crypto';

  @IsOptional()
  @Transform(toNormalizedBetType)
  @IsIn(['back', 'lay'])
  betType?: 'back' | 'lay';

  @IsOptional()
  @Transform(toNormalizedBetType)
  @IsIn(['back', 'lay'])
  type?: 'back' | 'lay';

  @IsOptional()
  @Transform(toTrimmedString)
  @IsString()
  @MaxLength(80)
  clientRequestId?: string;
}

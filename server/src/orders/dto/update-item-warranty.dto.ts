import { IsString, IsNotEmpty, IsNumber, Min } from 'class-validator';

export class UpdateItemWarrantyDto {
  @IsString()
  @IsNotEmpty()
  serialNumber: string;

  @IsNumber()
  @Min(0)
  warrantyMonths: number;
}

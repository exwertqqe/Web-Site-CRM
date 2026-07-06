import {
  IsString,
  IsNumber,
  IsOptional,
  IsArray,
  IsInt,
  Min,
} from 'class-validator';

export class CreateProductDto {
  @IsString()
  name: string;

  @IsString()
  slug: string;

  @IsString()
  description: string;

  @IsNumber()
  @Min(0)
  price: number;

  @IsInt()
  categoryId: number;

  @IsOptional()
  attributes?: Record<string, any>;

  @IsOptional()
  @IsArray()
  variants?: any[];
}

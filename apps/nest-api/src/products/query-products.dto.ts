import { CATEGORIES, type Category } from '@lab/core';
import { Transform } from 'class-transformer';
import { IsBoolean, IsIn, IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

/**
 * DTO = the contract at the edge of the system.
 *
 * The decorators are runtime validation; the class is also the TypeScript type.
 * That duality is the whole reason Nest uses classes instead of interfaces for
 * DTOs — an interface is erased at runtime and cannot carry metadata.
 *
 * If asked what you would use instead: zod + `nestjs-zod`, which gives one
 * schema for validation AND inference, and is where a lot of teams have moved.
 */
export class QueryProductsDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  q?: string;

  @IsOptional()
  @IsIn([...CATEGORIES, 'all'])
  category?: Category | 'all';

  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  inStockOnly?: boolean;

  @IsOptional()
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize?: number;
}

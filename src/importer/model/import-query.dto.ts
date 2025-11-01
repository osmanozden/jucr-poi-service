import { IsNotEmpty, Matches, Length } from 'class-validator';
import { Transform } from 'class-transformer';

export class ImportQueryDto {
  @IsNotEmpty({ message: 'The countryCode query parameter is mandatory. You must provide a country code to proceed with the operation.' })
  @Length(2, 2, { message: 'The countryCode must be exactly 2 characters long, conforming to ISO 3166-1 alpha-2 standard.' })
  @Transform(({ value }) => value.trim()) 
  @Transform(({ value }) => value.toUpperCase()) 
  @Matches(/^[a-zA-Z]+$/, { message: 'The countryCode must contain only alphabetic characters.' }) 
  countryCode: string;
}
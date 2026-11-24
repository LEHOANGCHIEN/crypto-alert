import { IsTimezone, OptionalEnum, TextField } from '../../../common/validators';

export class UpdateProfileDto {
  @TextField(2, 50) displayName!: string;
}

export class UpdateSettingsDto {
  @OptionalEnum(['vi', 'en']) locale?: 'vi' | 'en';
  @OptionalEnum(['dark', 'light']) theme?: 'dark' | 'light';
  @IsTimezone() timezone?: string;
}

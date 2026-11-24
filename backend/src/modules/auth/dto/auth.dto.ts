import { EmailField, OptionalEnum, PasswordField, IsTimezone, TextField } from '../../../common/validators';
import { IsDefined, IsNotEmpty, IsString } from 'class-validator';

export class RegisterDto {
  @EmailField() email!: string;
  @PasswordField() password!: string;
  @TextField(2, 50) displayName!: string;
  @OptionalEnum(['vi', 'en']) locale?: 'vi' | 'en';
  @OptionalEnum(['dark', 'light']) theme?: 'dark' | 'light';
  @IsTimezone() timezone?: string;
}

/** Login does not validate password strength (API.md §3.1) — only that it is present. */
export class LoginDto {
  @EmailField() email!: string;
  @IsString() @IsNotEmpty() @IsDefined() password!: string;
}

export class ChangePasswordDto {
  @IsString() @IsNotEmpty() @IsDefined() currentPassword!: string;
  @PasswordField() newPassword!: string;
}

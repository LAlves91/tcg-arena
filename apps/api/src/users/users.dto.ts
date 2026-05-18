import { updateMeBodySchema } from '@tcg/shared';
import { createZodDto } from 'nestjs-zod';

export class UpdateMeDto extends createZodDto(updateMeBodySchema) {}

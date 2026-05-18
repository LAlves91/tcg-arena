import { createFriendBodySchema, updateFriendBodySchema } from '@tcg/shared';
import { createZodDto } from 'nestjs-zod';

export class CreateFriendDto extends createZodDto(createFriendBodySchema) {}
export class UpdateFriendDto extends createZodDto(updateFriendBodySchema) {}

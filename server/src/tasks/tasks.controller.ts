import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Request,
} from '@nestjs/common';
import {
  TasksService,
  UpdateTaskDto,
} from './tasks.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@Controller('tasks')
@UseGuards(JwtAuthGuard, RolesGuard)
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  @Get()
  @Roles('ADMIN', 'MANAGER', 'WAREHOUSE', 'CONTENT')
  findAll() {
    return this.tasksService.findAll();
  }

  @Get(':id')
  @Roles('ADMIN', 'MANAGER', 'WAREHOUSE', 'CONTENT')
  findOne(@Param('id') id: string) {
    return this.tasksService.findOne(+id);
  }

  @Post()
  @Roles('ADMIN', 'MANAGER')
  create(@Body() createTaskDto: any, @Request() req: any) {
    console.log(
      'DEBUG: TasksController.create - Body received:',
      JSON.stringify(createTaskDto),
    );
    console.log('DEBUG: TasksController.create - User ID:', req.user.userId);
    return this.tasksService.create(createTaskDto, req.user.userId);
  }

  @Patch('positions')
  @Roles('ADMIN', 'MANAGER', 'WAREHOUSE', 'CONTENT')
  updatePositions(
    @Body()
    updates: {
      id: number;
      status: 'TODO' | 'IN_PROGRESS' | 'DONE';
      order: number;
    }[],
    @Request() req: any,
  ) {
    return this.tasksService.updatePositions(updates, req.user.userId);
  }

  @Patch(':id')
  @Roles('ADMIN', 'MANAGER', 'WAREHOUSE', 'CONTENT')
  update(
    @Param('id') id: string,
    @Body() updateTaskDto: Partial<UpdateTaskDto>,
    @Request() req: any,
  ) {
    // Automatically inject the user ID making the modification
    return this.tasksService.update(+id, {
      ...updateTaskDto,
      userId: req.user.userId,
    });
  }

  @Delete(':id')
  @Roles('ADMIN', 'MANAGER')
  remove(@Param('id') id: string) {
    return this.tasksService.remove(+id);
  }

  @Post(':id/comments')
  @Roles('ADMIN', 'MANAGER', 'WAREHOUSE', 'CONTENT')
  addComment(
    @Param('id') id: string,
    @Body('text') text: string,
    @Request() req: any,
  ) {
    return this.tasksService.addComment({
      text,
      taskId: +id,
      authorId: req.user.userId,
    });
  }
}

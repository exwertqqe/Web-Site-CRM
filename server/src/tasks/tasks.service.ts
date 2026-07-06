import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export class CreateTaskDto {
  title: string;
  description?: string;
  assignedToId?: number;
  deadline?: string;
}

export class UpdateTaskDto {
  title?: string;
  description?: string;
  status?: 'TODO' | 'IN_PROGRESS' | 'DONE';
  order?: number;
  assignedToId?: number;
  deadline?: string;
  userId: number; // For lastModifiedBy
}

export class CreateCommentDto {
  text: string;
  taskId: number;
  authorId: number;
}

@Injectable()
export class TasksService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.task.findMany({
      include: {
        assignedTo: { select: { id: true, name: true, email: true } },
        lastModifiedBy: { select: { id: true, name: true, email: true } },
        comments: {
          include: {
            author: { select: { id: true, name: true, email: true } },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
      orderBy: [{ status: 'asc' }, { order: 'asc' }],
    });
  }

  async findOne(id: number) {
    const task = await this.prisma.task.findUnique({
      where: { id },
      include: {
        assignedTo: { select: { id: true, name: true, email: true } },
        lastModifiedBy: { select: { id: true, name: true, email: true } },
        comments: {
          include: {
            author: { select: { id: true, name: true, email: true } },
          },
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!task) throw new NotFoundException(`Task #${id} not found`);
    return task;
  }

  async create(createTaskDto: CreateTaskDto, userId: number) {
    // Generate order: get max order for TODO
    const maxOrderTask = await this.prisma.task.findFirst({
      where: { status: 'TODO' },
      orderBy: { order: 'desc' },
    });
    const order = maxOrderTask ? maxOrderTask.order + 1000 : 1000;

    return this.prisma.task.create({
      data: {
        title: createTaskDto.title,
        description: createTaskDto.description,
        assignedToId: createTaskDto.assignedToId,
        deadline:
          createTaskDto.deadline && !isNaN(Date.parse(createTaskDto.deadline))
            ? new Date(createTaskDto.deadline)
            : null,
        order,
        lastModifiedById: Number(userId),
      },
      include: {
        assignedTo: { select: { id: true, name: true, email: true } },
        lastModifiedBy: { select: { id: true, name: true, email: true } },
        comments: {
          include: {
            author: { select: { id: true, name: true, email: true } },
          },
        },
      },
    });
  }

  async update(id: number, updateTaskDto: UpdateTaskDto) {
    await this.findOne(id); // Check existence

    return this.prisma.task.update({
      where: { id },
      data: {
        title: updateTaskDto.title,
        description: updateTaskDto.description,
        status: updateTaskDto.status,
        order: updateTaskDto.order,
        assignedToId: updateTaskDto.assignedToId,
        deadline:
          updateTaskDto.deadline && !isNaN(Date.parse(updateTaskDto.deadline))
            ? new Date(updateTaskDto.deadline)
            : undefined,
        lastModifiedById: Number(updateTaskDto.userId),
      },
      include: {
        assignedTo: { select: { id: true, name: true, email: true } },
        lastModifiedBy: { select: { id: true, name: true, email: true } },
        comments: {
          include: {
            author: { select: { id: true, name: true, email: true } },
          },
        },
      },
    });
  }

  async remove(id: number) {
    // delete comments first
    await this.prisma.comment.deleteMany({ where: { taskId: id } });
    return this.prisma.task.delete({
      where: { id },
    });
  }

  async addComment(createCommentDto: CreateCommentDto) {
    // Check task
    await this.findOne(createCommentDto.taskId);
    return this.prisma.comment.create({
      data: {
        text: createCommentDto.text,
        taskId: createCommentDto.taskId,
        authorId: createCommentDto.authorId,
      },
      include: {
        author: { select: { id: true, name: true, email: true } },
      },
    });
  }

  async updatePositions(
    updates: {
      id: number;
      status: 'TODO' | 'IN_PROGRESS' | 'DONE';
      order: number;
    }[],
    userId: number,
  ) {
    const promises = updates.map((u) =>
      this.prisma.task.update({
        where: { id: u.id },
        data: {
          status: u.status,
          order: u.order,
          lastModifiedById: userId,
        },
      }),
    );
    await Promise.all(promises);
    return { success: true };
  }
}

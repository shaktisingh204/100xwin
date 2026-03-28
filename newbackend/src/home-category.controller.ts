import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { HomeCategoryService } from './home-category.service';
import { CreateHomeCategoryDto } from './dto/create-home-category.dto';
import { UpdateHomeCategoryDto } from './dto/update-home-category.dto';

@Controller('home-category')
export class HomeCategoryController {
  constructor(private readonly homeCategoryService: HomeCategoryService) {}

  @Post()
  create(@Body() createHomeCategoryDto: CreateHomeCategoryDto) {
    return this.homeCategoryService.create(createHomeCategoryDto);
  }

  @Get()
  findAll() {
    return this.homeCategoryService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.homeCategoryService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateHomeCategoryDto: UpdateHomeCategoryDto) {
    return this.homeCategoryService.update(+id, updateHomeCategoryDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.homeCategoryService.remove(+id);
  }
}

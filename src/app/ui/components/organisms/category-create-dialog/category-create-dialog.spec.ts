import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DialogModule } from '@angular/cdk/dialog';
import { CategoryCreateDialogComponent } from './category-create-dialog';

describe('CategoryCreateDialogComponent', () => {
  let component: CategoryCreateDialogComponent;
  let fixture: ComponentFixture<CategoryCreateDialogComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CategoryCreateDialogComponent, DialogModule]
    }).compileComponents();

    fixture = TestBed.createComponent(CategoryCreateDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

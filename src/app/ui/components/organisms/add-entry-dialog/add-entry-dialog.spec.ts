import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DialogModule } from '@angular/cdk/dialog';
import { AddEntryDialog } from './add-entry-dialog';

describe('AddEntryDialog', () => {
  let component: AddEntryDialog;
  let fixture: ComponentFixture<AddEntryDialog>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AddEntryDialog, DialogModule]
    }).compileComponents();

    fixture = TestBed.createComponent(AddEntryDialog);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

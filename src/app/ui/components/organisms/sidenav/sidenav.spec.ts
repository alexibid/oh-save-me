import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Sidenav } from './sidenav';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { RouterModule } from '@angular/router';
import { APP_STORE_TOKEN } from '@application/app-store';
import { createMockStore } from '@/mocks/store.mock';

describe('Sidenav', () => {
  let component: Sidenav;
  let fixture: ComponentFixture<Sidenav>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        Sidenav,
        BrowserAnimationsModule,
        RouterModule.forRoot([])
      ],
      providers: [
        {
          provide: APP_STORE_TOKEN,
          useValue: createMockStore()
        }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(Sidenav);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

import { Component, booleanAttribute, inject, input, output } from '@angular/core';
import { SidenavMenuComponent } from '@ui/components/molecules/sidenav-menu/sidenav-menu';
import { CategoriesSelectors } from '@application/selectors/categories.selectors';
import { CategoryInfo } from '@domain/models/category';
import { HeaderNavComponent } from 'ibid-ui';

@Component({
  selector: 'ohsaveme-sidenav',
  standalone: true,
  imports: [HeaderNavComponent, SidenavMenuComponent],
  templateUrl: './sidenav.html',
  styleUrl: './sidenav.scss'
})
export class Sidenav {
  private readonly categoriesSelectors = inject(CategoriesSelectors);
  readonly open = input(false, { transform: booleanAttribute });
  readonly closeClicked = output<void>();

  get categories(): readonly CategoryInfo[] {
    return this.categoriesSelectors.listData();
  }

  get customCategories(): readonly CategoryInfo[] {
    return this.categoriesSelectors.listData();
  }
}

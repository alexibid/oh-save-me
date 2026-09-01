import { Routes } from '@angular/router';
import { DashboardComponent } from './ui/pages/dashboard/dashboard';

export const routes: Routes = [
  { path: '', component: DashboardComponent },

  { path: 'categories/manage', loadComponent: () => import('./ui/pages/categories-edit/categories-edit').then(m => m.CategoriesEditComponent) },
  { path: 'categorias/gerir', loadComponent: () => import('./ui/pages/categories-edit/categories-edit').then(m => m.CategoriesEditComponent) },
  { path: 'categories/list', loadComponent: () => import('./ui/pages/categories-list/categories-list').then(m => m.CategoriesListComponent) },
  { path: 'categorias/lista', loadComponent: () => import('./ui/pages/categories-list/categories-list').then(m => m.CategoriesListComponent) },
  { path: 'categories/list/:id', loadComponent: () => import('./ui/pages/categories-list/categories-list').then(m => m.CategoriesListComponent) },
  { path: 'categorias/listar/:id', loadComponent: () => import('./ui/pages/categories-list/categories-list').then(m => m.CategoriesListComponent) },

  { path: 'budget', loadComponent: () => import('./ui/pages/budget/budget').then(m => m.BudgetComponent) },
  { path: 'orcamento', loadComponent: () => import('./ui/pages/budget/budget').then(m => m.BudgetComponent) },

  { path: 'portfolio', loadComponent: () => import('./ui/pages/portfolio/portfolio').then(m => m.PortfolioComponent) },
  { path: 'carteira', loadComponent: () => import('./ui/pages/portfolio/portfolio').then(m => m.PortfolioComponent) },

  { path: 'movements', loadComponent: () => import('./ui/pages/movements/movements').then(m => m.MovementsComponent) },
  { path: 'movimentos', loadComponent: () => import('./ui/pages/movements/movements').then(m => m.MovementsComponent) },

  { path: 'database', loadComponent: () => import('./ui/pages/database/database').then(m => m.DatabaseComponent) },
  { path: 'bd', loadComponent: () => import('./ui/pages/database/database').then(m => m.DatabaseComponent) },

  { path: '**', redirectTo: '' }
];


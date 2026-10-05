import { Routes } from '@angular/router';
import { MenuComponent } from './components/customer/menu/menu.component';
import { CartComponent } from './components/customer/cart/cart.component';
import { CheckoutComponent } from './components/customer/checkout/checkout.component';
import { DashboardComponent } from './components/cashier/dashboard/dashboard.component';

export const routes: Routes = [
  { path: '', redirectTo: 'menu', pathMatch: 'full' },
  { path: 'menu', component: MenuComponent },
  { path: 'cart', component: CartComponent },
  { path: 'checkout', component: CheckoutComponent },
  { path: 'cashier', component: DashboardComponent },
  { path: '**', redirectTo: 'menu' }
];
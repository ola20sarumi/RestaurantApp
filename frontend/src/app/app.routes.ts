import { Routes } from '@angular/router';
import { MenuComponent } from './components/customer/menu/menu.component';
import { CartComponent } from './components/customer/cart/cart.component';
import { CheckoutComponent } from './components/customer/checkout/checkout.component';
import { OrderStatusComponent } from './components/customer/order-status/order-status.component';
import { DashboardComponent } from './components/cashier/dashboard/dashboard.component';
import { MenuAdminComponent } from './components/admin/menu-admin/menu-admin.component';
import { ReportsComponent } from './components/admin/reports/reports.component';
import { LoginComponent } from './components/auth/login/login.component';
import { staffGuard } from './services/auth.guard';

export const routes: Routes = [
  { path: '', redirectTo: 'menu', pathMatch: 'full' },
  { path: 'menu', component: MenuComponent },
  { path: 'cart', component: CartComponent },
  { path: 'checkout', component: CheckoutComponent },
  // Order confirmation; Paystack sends customers back here after paying.
  { path: 'order/:orderRef', component: OrderStatusComponent },
  { path: 'login', component: LoginComponent },
  // Staff pages: admins can open both, cashiers only the cashier page.
  { path: 'cashier', component: DashboardComponent, canActivate: [staffGuard], data: { roles: ['Admin', 'Cashier'] } },
  { path: 'admin', component: MenuAdminComponent, canActivate: [staffGuard], data: { roles: ['Admin'] } },
  { path: 'admin/reports', component: ReportsComponent, canActivate: [staffGuard], data: { roles: ['Admin'] } },
  { path: '**', redirectTo: 'menu' }
];

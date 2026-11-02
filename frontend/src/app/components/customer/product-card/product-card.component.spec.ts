import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Product } from '../../../models/restaurant.models';
import { provideNairaLocale } from '../../../../testing/naira-locale';
import { ProductCardComponent } from './product-card.component';

const wings: Product = {
  id: 3,
  name: 'Buffalo Chicken Wings',
  description: '8 crispy wings tossed in spicy buffalo sauce with ranch dip.',
  price: 5500,
  imageUrl: 'wings.jpg',
  isAvailable: true,
  categoryId: 1,
  category: { id: 1, name: 'Appetizers', description: null }
};

describe('ProductCardComponent', () => {
  let fixture: ComponentFixture<ProductCardComponent>;
  let element: HTMLElement;

  function render(product: Product, quantityInCart = 0): void {
    fixture.componentRef.setInput('product', product);
    fixture.componentRef.setInput('quantityInCart', quantityInCart);
    fixture.detectChanges();
  }

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [ProductCardComponent], providers: [provideNairaLocale()] });
    fixture = TestBed.createComponent(ProductCardComponent);
    element = fixture.nativeElement;
  });

  it('shows the dish name, category, description, photo and price in naira', () => {
    render(wings);

    expect(element.querySelector('.card-title')?.textContent?.trim()).toBe('Buffalo Chicken Wings');
    expect(element.querySelector('.badge')?.textContent?.trim()).toBe('Appetizers');
    expect(element.querySelector('.card-text')?.textContent).toContain('8 crispy wings');
    expect(element.querySelector('.price-tag')?.textContent?.trim()).toBe('₦5,500.00');
    expect(element.querySelector('img')?.getAttribute('alt')).toBe('Buffalo Chicken Wings');
  });

  it('shows a placeholder instead of a photo when the dish has none', () => {
    render({ ...wings, imageUrl: null });

    expect(element.querySelector('img')).toBeNull();
    expect(element.querySelector('.placeholder-img .bi-egg-fried')).not.toBeNull();
  });

  it('emits the product when "Add" is clicked', () => {
    render(wings);
    const added: Product[] = [];
    fixture.componentInstance.add.subscribe((product: Product) => added.push(product));

    element.querySelector<HTMLButtonElement>('.add-btn')!.click();

    expect(added).toEqual([wings]);
  });

  it('shows how many are in the cart only when there are some', () => {
    render(wings);
    expect(element.querySelector('.add-btn .badge')).toBeNull();

    render(wings, 2);
    expect(element.querySelector('.add-btn .badge')?.textContent?.trim()).toBe('2');
  });
});

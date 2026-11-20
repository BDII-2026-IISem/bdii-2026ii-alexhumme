import {
  Component,
  computed,
  inject,
  signal,
} from '@angular/core';

import { CurrencyPipe, DatePipe } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { catchError, forkJoin, of } from 'rxjs';

import { ConfirmationService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { MessageModule } from 'primeng/message';
import { SelectModule } from 'primeng/select';
import { TableModule } from 'primeng/table';
import { TabsModule } from 'primeng/tabs';
import { TagModule } from 'primeng/tag';
import { TextareaModule } from 'primeng/textarea';
import { TooltipModule } from 'primeng/tooltip';

import {
  FormsModule,
  NonNullableFormBuilder,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';

import { STATUS_OPTIONS, Status } from '../../../core/models/api.model';
import { Customer } from '../../../core/models/customer.model';
import { Payment, PaymentPayload } from '../../../core/models/payment.model';
import { Sale, SaleCreatePayload } from '../../../core/models/sale.model';
import { SerializedUnit } from '../../../core/models/serialized-unit.model';
import {
  Warranty,
  WarrantyPayload,
  WarrantyType,
} from '../../../core/models/warranty.model';
import { Notification } from '../../../core/services/notification';
import { SessionStore } from '../../../core/services/session-store';
import { filterRows } from '../../../core/utils/filter-rows';
import { toApiMessage } from '../../../core/utils/to-api-message';
import { HasPermission } from '../../../shared/directives/has-permission';
import { EmptyState } from '../../../shared/ui/empty-state/empty-state';
import { PageHeader } from '../../../shared/ui/page-header/page-header';
import { PaymentForm } from '../../../shared/ui/payment-form/payment-form';
import { StatusTag } from '../../../shared/ui/status-tag/status-tag';
import { CustomerApi } from '../../customers/customer-api';
import { PaymentApi } from '../../payments/payment-api';
import { SerializedUnitApi } from '../../serialized-units/serialized-unit-api';
import { WarrantyApi } from '../../warranties/warranty-api';
import { SaleApi } from '../sale-api';
import { SaleForm } from '../sale-form/sale-form';
import { todayLocalDate } from '../sale-date';

/** Opciones del filtro de estado de la columna izquierda. */
const STATUS_FILTER_OPTIONS: Array<{ label: string; value: Status | 'all' }> = [
  { label: 'Todos los estados', value: 'all' },
  { label: 'Activas', value: 'active' },
  { label: 'Anuladas', value: 'inactive' },
];

const WARRANTY_TYPE_OPTIONS: Array<{ label: string; value: WarrantyType }> = [
  { label: 'Garantía comercial', value: 'commercial' },
  { label: 'Garantía extendida', value: 'extended' },
];

/**
 * Vista maestro-detalle de ventas: columna izquierda con el listado
 * (búsqueda, filtro y alta); panel derecho con el resumen de la venta
 * seleccionada y sus pestañas —líneas, garantías y pagos—.
 */
@Component({
  host: { class: 'block' },
  selector: 'app-sale-list',
  imports: [
    ButtonModule,
    CurrencyPipe,
    DatePipe,
    DialogModule,
    EmptyState,
    FormsModule,
    HasPermission,
    InputTextModule,
    MessageModule,
    PageHeader,
    PaymentForm,
    ReactiveFormsModule,
    SelectModule,
    StatusTag,
    TableModule,
    TabsModule,
    TagModule,
    TextareaModule,
    TooltipModule,
    SaleForm,
  ],
  templateUrl: './sale-list.html',
  styleUrl: './sale-list.css',
})
export class SaleList {
  private readonly api = inject(SaleApi);
  private readonly customersApi = inject(CustomerApi);
  private readonly unitsApi = inject(SerializedUnitApi);
  private readonly warrantyApi = inject(WarrantyApi);
  private readonly paymentApi = inject(PaymentApi);
  private readonly route = inject(ActivatedRoute);
  private readonly notify = inject(Notification);
  private readonly confirmation = inject(ConfirmationService);
  private readonly session = inject(SessionStore);
  private readonly fb = inject(NonNullableFormBuilder);

  readonly statusOptions = STATUS_OPTIONS;
  readonly statusFilterOptions = STATUS_FILTER_OPTIONS;
  readonly warrantyTypeOptions = WARRANTY_TYPE_OPTIONS;

  /** Listado de la columna izquierda. */
  readonly sales = signal<Sale[]>([]);
  readonly customers = signal<Customer[]>([]);
  readonly units = signal<SerializedUnit[]>([]);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly filter = signal('');
  readonly statusFilter = signal<Status | 'all'>('all');

  /** Panel de detalle. */
  private readonly selectedSale = signal<Sale | null>(null);
  readonly loadingDetail = signal(false);
  readonly warranties = signal<Warranty[]>([]);
  readonly payments = signal<Payment[]>([]);
  readonly detailTab = signal<'lineas' | 'garantias' | 'pagos'>('lineas');
  readonly voiding = signal(false);

  /** Diálogo «Nueva venta». */
  readonly createVisible = signal(false);
  readonly createSaving = signal(false);
  readonly createError = signal<string | null>(null);
  readonly createResetKey = signal(0);

  /** Diálogo «Nueva garantía». */
  readonly warrantyVisible = signal(false);
  readonly warrantySaving = signal(false);
  readonly warrantyError = signal<string | null>(null);

  /** Diálogo «Nuevo pago». */
  readonly paymentVisible = signal(false);
  readonly paymentSaving = signal(false);
  readonly paymentError = signal<string | null>(null);
  readonly paymentResetKey = signal(0);

  readonly warrantyForm = this.fb.group({
    saleDetailId: [null as number | null, [Validators.required]],
    startDate: [todayLocalDate(), [Validators.required]],
    endDate: ['', [Validators.required]],
    warrantyType: ['commercial' as WarrantyType, [Validators.required]],
    description: ['', [Validators.maxLength(255)]],
  });

  /** Id de la venta enlazada desde `/detalle-ventas` (`?id=`). */
  private readonly initialId = Number(
    this.route.snapshot.queryParamMap.get('id'),
  );

  readonly visibleSales = computed(() => {
    const rows = filterRows(this.sales(), this.filter(), (sale) => [
      String(sale.id),
      sale.customerName,
      ...sale.lines.map((line) => line.serializedUnitSerial),
    ]);
    const status = this.statusFilter();
    return status === 'all'
      ? rows
      : rows.filter((sale) => sale.status === status);
  });

  readonly hasDetail = computed(() => this.selectedSale() !== null);
  readonly sale = this.selectedSale.asReadonly();

  readonly saleId = computed(() => this.selectedSale()?.id ?? 0);

  /** Las pestañas se muestran solo si la sesión puede leer el recurso. */
  readonly canSeeWarranties = computed(() =>
    this.session.canPermission('GET /api/warranties'),
  );
  readonly canSeePayments = computed(() =>
    this.session.canPermission('GET /api/payments'),
  );

  /** Líneas de la venta como opciones del selector de garantías. */
  readonly lineOptions = computed(() =>
    (this.selectedSale()?.lines ?? []).map((line) => ({
      value: line.id,
      label: `${line.serializedUnitSerial} — ${line.productName}`,
    })),
  );

  readonly unitsCount = computed(() =>
    (this.selectedSale()?.lines ?? []).reduce(
      (sum, line) => sum + line.quantity,
      0,
    ),
  );

  constructor() {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.error.set(null);

    forkJoin({
      sales: this.api.list(),
      customers: this.customersApi
        .list('active')
        .pipe(catchError(() => of([] as Customer[]))),
      units: this.unitsApi
        .list('active')
        .pipe(catchError(() => of([] as SerializedUnit[]))),
    }).subscribe({
      next: ({ sales, customers, units }) => {
        this.sales.set(sales);
        this.customers.set(customers);
        this.units.set(units);
        this.loading.set(false);

        // El panel nunca queda vacío: se respeta `?id=`, luego la selección
        // actual y por último la primera venta.
        const wanted =
          this.initialId || this.selectedSale()?.id || sales[0]?.id;
        const target = sales.find((sale) => sale.id === wanted);
        if (target) {
          if (this.selectedSale()?.id !== target.id) {
            this.select(target);
          } else {
            // Misma venta con datos frescos (p. ej. tras anularla).
            this.selectedSale.set(target);
          }
        }
      },
      error: (error: unknown) => {
        this.sales.set([]);
        this.error.set(toApiMessage(error));
        this.loading.set(false);
      },
    });
  }

  isSelected(sale: Sale): boolean {
    return this.selectedSale()?.id === sale.id;
  }

  select(sale: Sale): void {
    if (this.isSelected(sale)) return;
    this.selectedSale.set(sale);
    this.detailTab.set('lineas');
    this.loadDetail(sale.id);
  }

  private loadDetail(saleId: number): void {
    this.loadingDetail.set(true);

    forkJoin({
      warranties: this.warrantyApi
        .list({ sale: saleId })
        .pipe(catchError(() => of([] as Warranty[]))),
      payments: this.paymentApi
        .list({
          reference_type: 'sale',
          reference_id: saleId,
        })
        .pipe(catchError(() => of([] as Payment[]))),
    }).subscribe({
      next: ({ warranties, payments }) => {
        // Respuesta tardía de una selección que ya cambió: se descarta.
        if (this.selectedSale()?.id !== saleId) return;
        this.warranties.set(warranties);
        this.payments.set(payments);
        this.loadingDetail.set(false);
      },
      error: (error: unknown) => {
        if (this.selectedSale()?.id !== saleId) return;
        this.warranties.set([]);
        this.payments.set([]);
        this.loadingDetail.set(false);
        this.notify.error(
          'No se pudo cargar el detalle de la venta',
          toApiMessage(error),
        );
      },
    });
  }

  /** Nombre visible: el que trae la venta, luego el id. */
  customerName(sale: Sale): string {
    return sale.customerName || `Cliente #${sale.customerId}`;
  }

  openCreate(): void {
    this.createResetKey.update((key) => key + 1);
    this.createError.set(null);
    this.createVisible.set(true);
  }

  save(payload: SaleCreatePayload): void {
    this.createSaving.set(true);
    this.createError.set(null);

    this.api.create(payload).subscribe({
      next: (created) => {
        this.createSaving.set(false);
        this.createVisible.set(false);
        this.notify.success('Venta registrada');
        this.load();
        this.select(created);
      },
      error: (error: unknown) => {
        this.createSaving.set(false);
        this.createError.set(toApiMessage(error));
      },
    });
  }

  openWarrantyCreate(): void {
    this.warrantyError.set(null);
    this.warrantyForm.reset({
      saleDetailId: null,
      startDate: todayLocalDate(),
      endDate: '',
      warrantyType: 'commercial',
      description: '',
    });
    this.warrantyVisible.set(true);
  }

  saveWarranty(): void {
    if (this.warrantyForm.invalid) {
      this.warrantyForm.markAllAsTouched();
      return;
    }

    const value = this.warrantyForm.getRawValue();

    if (value.saleDetailId === null) {
      return;
    }

    const payload: WarrantyPayload = {
      saleDetailId: value.saleDetailId,
      startDate: value.startDate,
      endDate: value.endDate,
      warrantyType: value.warrantyType,
      description: value.description.trim() || null,
      // Las entidades hijas nacen activas por convención del proyecto.
      status: 'active',
    };

    this.warrantySaving.set(true);
    this.warrantyError.set(null);

    this.warrantyApi.create(payload).subscribe({
      next: () => {
        this.warrantySaving.set(false);
        this.warrantyVisible.set(false);
        this.notify.success('Garantía creada');
        this.loadDetail(this.saleId());
      },
      error: (error: unknown) => {
        this.warrantySaving.set(false);
        this.warrantyError.set(toApiMessage(error));
      },
    });
  }

  removeWarranty(warranty: Warranty): void {
    this.confirmation.confirm({
      header: 'Eliminar garantía',
      message: `¿Deseas eliminar la garantía de ${warranty.serializedUnitSerial}?`,
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Eliminar',
      rejectLabel: 'Cancelar',
      accept: () => {
        this.warrantyApi.remove(warranty.id).subscribe({
          next: () => {
            this.notify.warn('Garantía eliminada');
            this.loadDetail(this.saleId());
          },
          error: (error: unknown) =>
            this.notify.error('No se pudo eliminar', toApiMessage(error)),
        });
      },
    });
  }

  openPaymentCreate(): void {
    this.paymentResetKey.update((key) => key + 1);
    this.paymentError.set(null);
    this.paymentVisible.set(true);
  }

  savePayment(payload: PaymentPayload): void {
    this.paymentSaving.set(true);
    this.paymentError.set(null);

    this.paymentApi.create(payload).subscribe({
      next: () => {
        this.paymentSaving.set(false);
        this.paymentVisible.set(false);
        this.notify.success('Pago registrado');
        this.loadDetail(this.saleId());
      },
      error: (error: unknown) => {
        this.paymentSaving.set(false);
        this.paymentError.set(toApiMessage(error));
      },
    });
  }

  removePayment(payment: Payment): void {
    this.confirmation.confirm({
      header: 'Eliminar pago',
      message: `¿Deseas eliminar el pago de ${payment.amount}?`,
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Eliminar',
      rejectLabel: 'Cancelar',
      accept: () => {
        this.paymentApi.remove(payment.id).subscribe({
          next: () => {
            this.notify.warn('Pago eliminado');
            this.loadDetail(this.saleId());
          },
          error: (error: unknown) =>
            this.notify.error('No se pudo eliminar', toApiMessage(error)),
        });
      },
    });
  }

  voidSale(): void {
    const sale = this.selectedSale();

    if (!sale || sale.status !== 'active') {
      return;
    }

    this.confirmation.confirm({
      header: 'Anular venta',
      message: `¿Anular la venta #${sale.id}? Quedará como inactiva.`,
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Anular',
      rejectLabel: 'Cancelar',
      accept: () => {
        this.voiding.set(true);
        this.api.voidSale(sale.id).subscribe({
          next: () => {
            this.voiding.set(false);
            this.notify.warn('Venta anulada');
            this.load();
          },
          error: (error: unknown) => {
            this.voiding.set(false);
            this.notify.error(toApiMessage(error));
          },
        });
      },
    });
  }
}

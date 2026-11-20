import {
  Component,
  computed,
  inject,
  signal,
} from '@angular/core';

import { CurrencyPipe } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { catchError, forkJoin, of } from 'rxjs';

import {
  FormsModule,
  NonNullableFormBuilder,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';

import { ConfirmationService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputNumberModule } from 'primeng/inputnumber';
import { InputTextModule } from 'primeng/inputtext';
import { MessageModule } from 'primeng/message';
import { SelectModule } from 'primeng/select';
import { TableModule } from 'primeng/table';
import { TabsModule } from 'primeng/tabs';
import { TagModule } from 'primeng/tag';
import { TextareaModule } from 'primeng/textarea';
import { TooltipModule } from 'primeng/tooltip';

import { STATUS_OPTIONS, Status } from '../../../core/models/api.model';
import { Customer } from '../../../core/models/customer.model';
import {
  Diagnosis,
  DiagnosisPayload,
} from '../../../core/models/diagnosis.model';
import { Part } from '../../../core/models/part.model';
import {
  PartConsumption,
  PartConsumptionPayload,
} from '../../../core/models/part-consumption.model';
import { Payment, PaymentPayload } from '../../../core/models/payment.model';
import {
  ServiceOrder,
  ServiceOrderPayload,
} from '../../../core/models/service-order.model';
import { SerializedUnit } from '../../../core/models/serialized-unit.model';
import { SessionStore } from '../../../core/services/session-store';
import { Notification } from '../../../core/services/notification';
import { filterRows } from '../../../core/utils/filter-rows';
import { toApiMessage } from '../../../core/utils/to-api-message';
import { EmptyState } from '../../../shared/ui/empty-state/empty-state';
import { PageHeader } from '../../../shared/ui/page-header/page-header';
import { PaymentForm } from '../../../shared/ui/payment-form/payment-form';
import { StatusTag } from '../../../shared/ui/status-tag/status-tag';
import { CustomerApi } from '../../customers/customer-api';
import { PartApi } from '../../parts/part-api';
import { PaymentApi } from '../../payments/payment-api';
import { SerializedUnitApi } from '../../serialized-units/serialized-unit-api';
import { todayLocalDate } from '../../sales/sale-date';
import { DiagnosisApi } from '../diagnosis-api';
import { PartConsumptionApi } from '../part-consumption-api';
import { ServiceOrderApi } from '../service-order-api';

/** Opciones del filtro de estado de la columna izquierda. */
const STATUS_FILTER_OPTIONS: Array<{ label: string; value: Status | 'all' }> = [
  { label: 'Todos los estados', value: 'all' },
  { label: 'Activas', value: 'active' },
  { label: 'Inactivas', value: 'inactive' },
];

type DetailTab = 'ficha' | 'diagnosticos' | 'repuestos' | 'pagos';

/**
 * Vista maestro-detalle de órdenes de servicio: columna izquierda con el
 * listado; panel derecho con la orden seleccionada y sus pestañas —ficha,
 * diagnósticos, repuestos consumidos y pagos—.
 *
 * Las pestañas se muestran según el permiso `GET` de cada recurso (los roles
 * de modelo.md no comparten la misma matriz) y las cargas secundarias son
 * tolerantes a errores para que un 403 no tumbe la página entera.
 */
@Component({
  host: { class: 'block' },
  selector: 'app-service-order-list',
  imports: [
    ButtonModule,
    CurrencyPipe,
    DialogModule,
    EmptyState,
    FormsModule,
    InputNumberModule,
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
  ],
  templateUrl: './service-order-list.html',
  styleUrl: './service-order-list.css',
})
export class ServiceOrderList {
  private readonly api = inject(ServiceOrderApi);
  private readonly diagnosisApi = inject(DiagnosisApi);
  private readonly consumptionApi = inject(PartConsumptionApi);
  private readonly paymentApi = inject(PaymentApi);
  private readonly customersApi = inject(CustomerApi);
  private readonly unitsApi = inject(SerializedUnitApi);
  private readonly partsApi = inject(PartApi);
  private readonly session = inject(SessionStore);
  private readonly route = inject(ActivatedRoute);
  private readonly notify = inject(Notification);
  private readonly confirmation = inject(ConfirmationService);
  private readonly fb = inject(NonNullableFormBuilder);

  readonly statusOptions = STATUS_OPTIONS;
  readonly statusFilterOptions = STATUS_FILTER_OPTIONS;

  /** Listado de la columna izquierda. */
  readonly orders = signal<ServiceOrder[]>([]);
  readonly customers = signal<Customer[]>([]);
  readonly units = signal<SerializedUnit[]>([]);
  readonly parts = signal<Part[]>([]);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly filter = signal('');
  readonly statusFilter = signal<Status | 'all'>('all');

  /** Panel de detalle. */
  private readonly selectedOrder = signal<ServiceOrder | null>(null);
  readonly loadingDetail = signal(false);
  readonly diagnoses = signal<Diagnosis[]>([]);
  readonly consumptions = signal<PartConsumption[]>([]);
  readonly payments = signal<Payment[]>([]);
  readonly detailTab = signal<DetailTab>('ficha');
  readonly savingDetail = signal(false);
  readonly closing = signal(false);

  /** Diálogo «Nueva orden». */
  readonly createVisible = signal(false);
  readonly createSaving = signal(false);
  readonly createError = signal<string | null>(null);

  /** Diálogo «Nuevo diagnóstico». */
  readonly diagnosisVisible = signal(false);
  readonly diagnosisSaving = signal(false);
  readonly diagnosisError = signal<string | null>(null);

  /** Diálogo «Consumir repuesto». */
  readonly consumptionVisible = signal(false);
  readonly consumptionSaving = signal(false);
  readonly consumptionError = signal<string | null>(null);

  /** Diálogo «Nuevo pago». */
  readonly paymentVisible = signal(false);
  readonly paymentSaving = signal(false);
  readonly paymentError = signal<string | null>(null);
  readonly paymentResetKey = signal(0);

  readonly createForm = this.fb.group({
    customerId: [null as number | null, [Validators.required]],
    serializedUnitId: [null as number | null, [Validators.required]],
    openDate: [todayLocalDate(), [Validators.required]],
    closeDate: [''],
  });

  readonly detailForm = this.fb.group({
    customerId: [null as number | null, [Validators.required]],
    serializedUnitId: [null as number | null, [Validators.required]],
    openDate: ['', [Validators.required]],
    closeDate: [''],
    status: ['active' as Status, [Validators.required]],
  });

  readonly diagnosisForm = this.fb.group({
    description: [
      '',
      [Validators.required, Validators.maxLength(255)],
    ],
    diagnosisDate: [todayLocalDate(), [Validators.required]],
    observations: ['', [Validators.maxLength(255)]],
  });

  readonly consumptionForm = this.fb.group({
    partId: [null as number | null, [Validators.required]],
    quantity: [1, [Validators.required, Validators.min(1)]],
    unitPrice: [null as number | null, [Validators.min(0)]],
  });

  /** Id de la orden enlazada desde «Repuestos» (`/ordenes?id=`). */
  private readonly initialId = Number(
    this.route.snapshot.queryParamMap.get('id'),
  );

  // Permisos de las pestañas y acciones (matriz efectiva de la sesión).
  readonly canCreateOrder = computed(() =>
    this.session.canPermission('POST /api/service-orders'),
  );
  readonly canEditOrder = computed(() =>
    this.session.canPermission('PATCH /api/service-orders/:id'),
  );
  readonly canDeleteOrder = computed(() =>
    this.session.canPermission('DELETE /api/service-orders/:id'),
  );
  readonly canSeeDiagnoses = computed(() =>
    this.session.canPermission('GET /api/diagnostics'),
  );
  readonly canCreateDiagnosis = computed(() =>
    this.session.canPermission('POST /api/diagnostics'),
  );
  readonly canDeleteDiagnosis = computed(() =>
    this.session.canPermission('DELETE /api/diagnostics/:id'),
  );
  readonly canSeeConsumptions = computed(() =>
    this.session.canPermission('GET /api/part-consumptions'),
  );
  readonly canCreateConsumption = computed(() =>
    this.session.canPermission('POST /api/part-consumptions'),
  );
  readonly canDeleteConsumption = computed(() =>
    this.session.canPermission('DELETE /api/part-consumptions/:id'),
  );
  readonly canSeePayments = computed(() =>
    this.session.canPermission('GET /api/payments'),
  );
  readonly canCreatePayment = computed(() =>
    this.session.canPermission('POST /api/payments'),
  );
  readonly canDeletePayment = computed(() =>
    this.session.canPermission('DELETE /api/payments/:id'),
  );

  readonly visibleOrders = computed(() => {
    const rows = filterRows(this.orders(), this.filter(), (order) => [
      order.number,
      order.customerName,
      order.unitSerial,
      order.productName,
    ]);
    const status = this.statusFilter();
    return status === 'all'
      ? rows
      : rows.filter((order) => order.status === status);
  });

  readonly hasDetail = computed(() => this.selectedOrder() !== null);
  readonly order = this.selectedOrder.asReadonly();
  readonly orderId = computed(() => this.selectedOrder()?.id ?? 0);

  readonly customerOptions = computed(() =>
    this.customers().map((customer) => ({
      value: customer.id,
      label: `${customer.name} · ${customer.documentNumber}`,
    })),
  );

  readonly unitOptions = computed(() =>
    this.units().map((unit) => ({
      value: unit.id,
      label: `${unit.serial} — ${unit.productName}`,
    })),
  );

  readonly partOptions = computed(() =>
    this.parts().map((part) => ({
      value: part.id,
      label: `${part.name} · ${part.price} · ${part.stock} en bodega`,
    })),
  );

  constructor() {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.error.set(null);

    forkJoin({
      orders: this.api.list(),
      customers: this.customersApi
        .list('active')
        .pipe(catchError(() => of([] as Customer[]))),
      units: this.unitsApi
        .list('active')
        .pipe(catchError(() => of([] as SerializedUnit[]))),
      parts: this.partsApi
        .list({ status: 'active' })
        .pipe(catchError(() => of([] as Part[]))),
    }).subscribe({
      next: ({ orders, customers, units, parts }) => {
        this.orders.set(orders);
        this.customers.set(customers);
        this.units.set(units);
        this.parts.set(parts);
        this.loading.set(false);

        // El panel nunca queda vacío: se respeta `?id=`, luego la selección
        // actual y por último la primera orden.
        const wanted =
          this.initialId || this.selectedOrder()?.id || orders[0]?.id;
        const target = orders.find((row) => row.id === wanted);
        if (target) {
          if (this.selectedOrder()?.id !== target.id) {
            this.select(target);
          } else {
            // Misma orden con datos frescos (tras guardar o cerrar).
            this.selectedOrder.set(target);
          }
        }
      },
      error: (error: unknown) => {
        this.orders.set([]);
        this.error.set(toApiMessage(error));
        this.loading.set(false);
      },
    });
  }

  isSelected(order: ServiceOrder): boolean {
    return this.selectedOrder()?.id === order.id;
  }

  select(order: ServiceOrder): void {
    if (this.isSelected(order)) return;
    this.selectedOrder.set(order);
    this.detailTab.set('ficha');
    this.detailForm.reset({
      customerId: order.customerId,
      serializedUnitId: order.serializedUnitId,
      openDate: order.openDate,
      closeDate: order.closeDate ?? '',
      status: order.status,
    });
    this.loadDetail(order.id);
  }

  private loadDetail(orderId: number): void {
    this.loadingDetail.set(true);
    this.diagnoses.set([]);
    this.consumptions.set([]);
    this.payments.set([]);

    forkJoin({
      diagnoses: this.diagnosisApi
        .list({ service_order: orderId })
        .pipe(catchError(() => of([] as Diagnosis[]))),
      consumptions: this.consumptionApi
        .list({ service_order: orderId })
        .pipe(catchError(() => of([] as PartConsumption[]))),
      payments: this.paymentApi
        .list({
          reference_type: 'service_order',
          reference_id: orderId,
        })
        .pipe(catchError(() => of([] as Payment[]))),
    }).subscribe({
      next: ({ diagnoses, consumptions, payments }) => {
        // Respuesta tardía de una selección que ya cambió: se descarta.
        if (this.selectedOrder()?.id !== orderId) return;
        this.diagnoses.set(diagnoses);
        this.consumptions.set(consumptions);
        this.payments.set(payments);
        this.loadingDetail.set(false);
      },
    });
  }

  openCreate(): void {
    this.createError.set(null);
    this.createForm.reset({
      customerId: null,
      serializedUnitId: null,
      openDate: todayLocalDate(),
      closeDate: '',
    });
    this.createVisible.set(true);
  }

  createOrder(): void {
    if (this.createForm.invalid) {
      this.createForm.markAllAsTouched();
      return;
    }

    const value = this.createForm.getRawValue();

    if (value.customerId === null || value.serializedUnitId === null) {
      return;
    }

    const payload: ServiceOrderPayload = {
      customerId: value.customerId,
      serializedUnitId: value.serializedUnitId,
      openDate: value.openDate,
      closeDate: value.closeDate || null,
      status: 'active',
    };

    this.createSaving.set(true);
    this.createError.set(null);

    this.api.create(payload).subscribe({
      next: (created) => {
        this.createSaving.set(false);
        this.createVisible.set(false);
        this.notify.success('Orden creada');
        this.load();
        this.select(created);
      },
      error: (error: unknown) => {
        this.createSaving.set(false);
        this.createError.set(toApiMessage(error));
      },
    });
  }

  saveDetail(): void {
    if (this.detailForm.invalid) {
      this.detailForm.markAllAsTouched();
      return;
    }

    const order = this.selectedOrder();
    if (!order) return;

    const value = this.detailForm.getRawValue();

    if (value.customerId === null || value.serializedUnitId === null) {
      return;
    }

    const payload: ServiceOrderPayload = {
      customerId: value.customerId,
      serializedUnitId: value.serializedUnitId,
      openDate: value.openDate,
      closeDate: value.closeDate || null,
      status: value.status,
    };

    this.savingDetail.set(true);

    this.api.update(order.id, payload).subscribe({
      next: (updated) => {
        this.savingDetail.set(false);
        this.notify.success('Orden guardada');
        this.selectedOrder.set(updated);
        this.detailForm.reset({
          customerId: updated.customerId,
          serializedUnitId: updated.serializedUnitId,
          openDate: updated.openDate,
          closeDate: updated.closeDate ?? '',
          status: updated.status,
        });
        this.load();
        this.loadDetail(order.id);
      },
      error: (error: unknown) => {
        this.savingDetail.set(false);
        this.notify.error('No se pudo guardar la orden', toApiMessage(error));
      },
    });
  }

  /** Cierre operativo: registra `closeDate` hoy sin tocar el estado. */
  closeOrder(): void {
    const order = this.selectedOrder();

    if (!order || order.closeDate) {
      return;
    }

    this.confirmation.confirm({
      header: 'Cerrar orden',
      message: `¿Cerrar la orden ${order.number}? Se registra la fecha de hoy.`,
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Cerrar orden',
      rejectLabel: 'Cancelar',
      accept: () => {
        this.closing.set(true);
        this.api.update(order.id, { closeDate: todayLocalDate() }).subscribe({
          next: (updated) => {
            this.closing.set(false);
            this.notify.success('Orden cerrada');
            this.selectedOrder.set(updated);
            this.detailForm.patchValue({ closeDate: updated.closeDate ?? '' });
            this.load();
          },
          error: (error: unknown) => {
            this.closing.set(false);
            this.notify.error('No se pudo cerrar la orden', toApiMessage(error));
          },
        });
      },
    });
  }

  removeOrder(): void {
    const order = this.selectedOrder();
    if (!order) return;

    this.confirmation.confirm({
      header: 'Dar de baja',
      message: `¿Deseas dar de baja la orden ${order.number}?`,
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Dar de baja',
      rejectLabel: 'Cancelar',
      accept: () => {
        this.api.remove(order.id).subscribe({
          next: () => {
            this.notify.warn('Orden dada de baja');
            this.selectedOrder.set(null);
            this.load();
          },
          error: (error: unknown) =>
            this.notify.error('No se pudo dar de baja', toApiMessage(error)),
        });
      },
    });
  }

  openDiagnosisCreate(): void {
    this.diagnosisError.set(null);
    this.diagnosisForm.reset({
      description: '',
      diagnosisDate: todayLocalDate(),
      observations: '',
    });
    this.diagnosisVisible.set(true);
  }

  saveDiagnosis(): void {
    if (this.diagnosisForm.invalid) {
      this.diagnosisForm.markAllAsTouched();
      return;
    }

    const order = this.selectedOrder();
    if (!order) return;

    const value = this.diagnosisForm.getRawValue();

    const payload: DiagnosisPayload = {
      serviceOrderId: order.id,
      description: value.description.trim(),
      diagnosisDate: value.diagnosisDate,
      observations: value.observations.trim() || null,
      // Las entidades hijas nacen activas por convención del proyecto.
      status: 'active',
    };

    this.diagnosisSaving.set(true);
    this.diagnosisError.set(null);

    this.diagnosisApi.create(payload).subscribe({
      next: () => {
        this.diagnosisSaving.set(false);
        this.diagnosisVisible.set(false);
        this.notify.success('Diagnóstico registrado');
        this.loadDetail(order.id);
      },
      error: (error: unknown) => {
        this.diagnosisSaving.set(false);
        this.diagnosisError.set(toApiMessage(error));
      },
    });
  }

  removeDiagnosis(diagnosis: Diagnosis): void {
    const order = this.selectedOrder();
    if (!order) return;

    this.confirmation.confirm({
      header: 'Eliminar diagnóstico',
      message: '¿Deseas eliminar este diagnóstico?',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Eliminar',
      rejectLabel: 'Cancelar',
      accept: () => {
        this.diagnosisApi.remove(diagnosis.id).subscribe({
          next: () => {
            this.notify.warn('Diagnóstico eliminado');
            this.loadDetail(order.id);
          },
          error: (error: unknown) =>
            this.notify.error('No se pudo eliminar', toApiMessage(error)),
        });
      },
    });
  }

  openConsumptionCreate(): void {
    this.consumptionError.set(null);
    this.consumptionForm.reset({
      partId: null,
      quantity: 1,
      unitPrice: null,
    });
    this.consumptionVisible.set(true);
  }

  saveConsumption(): void {
    if (this.consumptionForm.invalid) {
      this.consumptionForm.markAllAsTouched();
      return;
    }

    const order = this.selectedOrder();
    if (!order) return;

    const value = this.consumptionForm.getRawValue();

    if (value.partId === null) {
      return;
    }

    // Sin precio explícito el backend usa el precio vigente del repuesto.
    const part = this.parts().find((row) => row.id === value.partId);
    const unitPrice =
      value.unitPrice !== null
        ? value.unitPrice.toFixed(2)
        : (part?.price ?? '0.00');

    const payload: PartConsumptionPayload = {
      serviceOrderId: order.id,
      partId: value.partId,
      quantity: value.quantity,
      unitPrice,
      status: 'active',
    };

    this.consumptionSaving.set(true);
    this.consumptionError.set(null);

    this.consumptionApi.create(payload).subscribe({
      next: () => {
        this.consumptionSaving.set(false);
        this.consumptionVisible.set(false);
        this.notify.success('Repuesto consumido');
        // El total de la orden lo recalcula el backend.
        this.load();
        this.loadDetail(order.id);
      },
      error: (error: unknown) => {
        this.consumptionSaving.set(false);
        this.consumptionError.set(toApiMessage(error));
      },
    });
  }

  removeConsumption(consumption: PartConsumption): void {
    const order = this.selectedOrder();
    if (!order) return;

    this.confirmation.confirm({
      header: 'Eliminar consumo',
      message: `¿Deseas eliminar el consumo de ${consumption.partName}?`,
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Eliminar',
      rejectLabel: 'Cancelar',
      accept: () => {
        this.consumptionApi.remove(consumption.id).subscribe({
          next: () => {
            this.notify.warn('Consumo eliminado');
            this.load();
            this.loadDetail(order.id);
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
    const order = this.selectedOrder();
    if (!order) return;

    this.paymentSaving.set(true);
    this.paymentError.set(null);

    this.paymentApi.create(payload).subscribe({
      next: () => {
        this.paymentSaving.set(false);
        this.paymentVisible.set(false);
        this.notify.success('Pago registrado');
        this.loadDetail(order.id);
      },
      error: (error: unknown) => {
        this.paymentSaving.set(false);
        this.paymentError.set(toApiMessage(error));
      },
    });
  }

  removePayment(payment: Payment): void {
    const order = this.selectedOrder();
    if (!order) return;

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
            this.loadDetail(order.id);
          },
          error: (error: unknown) =>
            this.notify.error('No se pudo eliminar', toApiMessage(error)),
        });
      },
    });
  }
}

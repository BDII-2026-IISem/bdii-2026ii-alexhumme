import {
  Component,
  computed,
  inject,
  signal,
} from '@angular/core';

import { ConfirmationService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { MessageModule } from 'primeng/message';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { TooltipModule } from 'primeng/tooltip';

import {
  Customer,
  CustomerPayload,
} from '../../../core/models/customer.model';

import { Notification } from '../../../core/services/notification';
import { filterRows } from '../../../core/utils/filter-rows';
import { CustomerApi } from '../customer-api';
import { CustomerForm } from '../customer-form/customer-form';

// Reutilizar aquí los componentes compartidos que ya existan
// en el proyecto, como PageHeader, EmptyState y StatusTag.

@Component({
  selector: 'app-customer-list',
  imports: [
    ButtonModule,
    DialogModule,
    InputTextModule,
    MessageModule,
    TableModule,
    TagModule,
    TooltipModule,
    CustomerForm,
  ],
  templateUrl: './customer-list.html',
  styleUrl: './customer-list.css',
  host: {
    class: 'block',
  },
})
export class CustomerList {
  private readonly api = inject(CustomerApi);
  private readonly notify = inject(Notification);
  private readonly confirmation = inject(ConfirmationService);

  readonly rows = signal<Customer[]>([]);
  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly error = signal<string | null>(null);

  readonly filter = signal('');
  readonly dialogVisible = signal(false);
  readonly editing = signal<Customer | null>(null);
  readonly resetKey = signal(0);

  readonly visibleRows = computed(() =>
    filterRows(
      this.rows(),
      this.filter(),
      (customer) => [
        customer.name,
        customer.email,
        customer.phone,
      ],
    ),
  );

  constructor() {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.error.set(null);

    this.api.list().subscribe({
      next: (rows) => {
        this.rows.set(rows);
        this.loading.set(false);
      },
      error: () => {
        this.rows.set([]);
        this.error.set(
          'No fue posible cargar los clientes. Verifica la conexión con el servidor.',
        );
        this.loading.set(false);
      },
    });
  }

  openCreate(): void {
    this.editing.set(null);
    this.resetKey.update((key) => key + 1);
    this.dialogVisible.set(true);
  }

  openEdit(customer: Customer): void {
    this.editing.set(customer);
    this.resetKey.update((key) => key + 1);
    this.dialogVisible.set(true);
  }

  save(payload: Omit<CustomerPayload, 'status'>): void {
    const current = this.editing();

    this.saving.set(true);

    const request = current
      ? this.api.update(current.id, payload)
      : this.api.create({
          ...payload,
          status: 'active',
        });

    request.subscribe({
      next: () => {
        this.saving.set(false);
        this.dialogVisible.set(false);

        if (current) {
          this.notify.success('Cliente actualizado');
        } else {
          this.notify.success('Cliente creado');
        }

        this.load();
      },
      error: () => {
        this.saving.set(false);
        this.notify.error(
          'No fue posible guardar el cliente',
        );
      },
    });
  }

  remove(customer: Customer): void {
    this.confirmation.confirm({
      header: 'Dar de baja',
      message: `¿Deseas dar de baja a ${customer.name}?`,
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Dar de baja',
      rejectLabel: 'Cancelar',

      accept: () => {
        this.api.remove(customer.id).subscribe({
          next: () => {
            this.notify.warn('Cliente dado de baja');
            this.load();
          },
          error: () => {
            this.notify.error(
              'No fue posible dar de baja al cliente',
            );
          },
        });
      },
    });
  }
}
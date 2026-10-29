import { Component } from '@angular/core';
import { CardModule } from 'primeng/card';
import { TagModule } from 'primeng/tag';

@Component({
  selector: 'app-placeholder',
  imports: [CardModule, TagModule],
  template: `
    <p-tag value="En desarrollo" severity="warn" [rounded]="true" />

    <p-card header="Pantalla en construcción" class="mt-4">
      <p class="m-0 text-slate-600">
        El módulo se implementará en los siguientes issues.
      </p>
    </p-card>
  `,
})
export class Placeholder {}

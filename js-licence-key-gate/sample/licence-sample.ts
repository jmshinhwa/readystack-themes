// src/app/widgets.ts: bootstrap for the invoicing SaaS dashboard (closed source)
import Handsontable from 'handsontable';
import { Calendar } from '@fullcalendar/core';
import resourceTimelinePlugin from '@fullcalendar/resource-timeline';
import tinymce from 'tinymce';
import { ClassicEditor, Essentials, Paragraph } from 'ckeditor5';
import { AllEnterpriseModule, ModuleRegistry } from 'ag-grid-enterprise';
import { DataGridPro } from '@mui/x-data-grid-pro';
import mapboxgl from 'mapbox-gl';

ModuleRegistry.registerModules([AllEnterpriseModule]);

export function mountSheet(el: HTMLElement, rows: unknown[][]) {
  return new Handsontable(el, {
    data: rows,
    colHeaders: true,
    licenseKey: 'non-commercial-and-evaluation',
  });
}

export function mountCalendar(el: HTMLElement) {
  const cal = new Calendar(el, {
    plugins: [resourceTimelinePlugin],
    initialView: 'resourceTimelineWeek',
    schedulerLicenseKey: 'GPL-My-Project-Is-Open-Source',
  });
  cal.render();
  return cal;
}

export function mountNotes(selector: string) {
  return tinymce.init({
    selector,
    license_key: 'gpl',
    menubar: false,
  });
}

export function mountContract(el: HTMLElement) {
  return ClassicEditor.create(el, {
    licenseKey: 'GPL',
    plugins: [Essentials, Paragraph],
  });
}

export function mountMap(el: HTMLElement, token: string) {
  mapboxgl.accessToken = token;
  return new mapboxgl.Map({ container: el, style: 'mapbox://styles/mapbox/streets-v12' });
}

export { DataGridPro };

import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { SolicitudService } from '../../core/services/solicitud.service';
import { environment } from '../../../environments/environment';

interface LinkDescarga {
  foto_id: number;
  url: string;
  nombre: string;
}

interface RespuestaDescarga {
  solicitud_id: number;
  nombre_jugador: string;
  total_fotos: number;
  links: LinkDescarga[];
}

@Component({
  selector: 'app-descargas',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatIconModule,
  ],
  templateUrl: './descargas.component.html',
  styleUrl: './descargas.component.css'
})
export class DescargasComponent implements OnInit {
  nombreApp = environment.nombreApp;
  cargando = true;
  error = '';
  datos: RespuestaDescarga | null = null;

  constructor(
    private route: ActivatedRoute,
    private solicitudService: SolicitudService,
    private cdr: ChangeDetectorRef,
    public router: Router,
  ) {}

  ngOnInit() {
    const id = this.route.snapshot.params['id'];
    this.solicitudService.obtenerLinksDescarga(id).subscribe({
      next: (datos: RespuestaDescarga) => {
        this.datos = datos;
        this.cargando = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        if (err.status === 403) {
          this.error = 'La descarga de estas fotos todavía no está habilitada. Contactá al fotógrafo.';
        } else if (err.status === 404) {
          this.error = 'No encontramos esta solicitud.';
        } else {
          this.error = 'Hubo un error. Intentá de nuevo más tarde.';
        }
        this.cargando = false;
        this.cdr.detectChanges();
      }
    });
  }

  descargarFoto(link: LinkDescarga, mostrarNotificacion: boolean = false) {
    fetch(link.url)
      .then(response => response.blob())
      .then(blob => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = link.nombre || `foto_${link.foto_id}.jpg`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        if (mostrarNotificacion) {
          this.mostrarMensaje('Foto descargada');
        }
      })
      .catch(() => {
        // Si falla el blob, abrimos en nueva pestaña como fallback
        window.open(link.url, '_blank');
      });
  }

  mostrarMensaje(texto: string) {
    const div = document.createElement('div');
    div.textContent = texto;
    div.style.cssText = `
      position: fixed;
      bottom: 24px;
      left: 50%;
      transform: translateX(-50%);
      background: #22c55e;
      color: white;
      padding: 10px 24px;
      border-radius: 8px;
      font-size: 14px;
      font-weight: 600;
      z-index: 9999;
      animation: fadeIn .2s ease;
    `;
    document.body.appendChild(div);
    setTimeout(() => document.body.removeChild(div), 2500);
  }

  descargarTodas() {
    if (!this.datos) return;
    this.datos.links.forEach((link, index) => {
      setTimeout(() => this.descargarFoto(link), index * 500);
    });
    setTimeout(() => this.mostrarMensaje(`${this.datos!.total_fotos} fotos descargadas`), 
      this.datos.links.length * 500 + 200);
  }
}
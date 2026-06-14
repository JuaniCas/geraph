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

  descargarFoto(link: LinkDescarga) {
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
      })
      .catch(() => {
        // Si falla el blob, abrimos en nueva pestaña como fallback
        window.open(link.url, '_blank');
      });
  }

  descargarTodas() {
    if (!this.datos) return;
    this.datos.links.forEach((link, index) => {
      setTimeout(() => this.descargarFoto(link), index * 500);
    });
  }
}
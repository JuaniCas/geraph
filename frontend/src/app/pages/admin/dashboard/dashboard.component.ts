import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatBadgeModule } from '@angular/material/badge';
import { MatChipsModule } from '@angular/material/chips';
import { AuthService } from '../../../core/services/auth.service';
import { PartidoService, Partido, UsoStorage} from '../../../core/services/partido.service';
import { SolicitudService, Solicitud } from '../../../core/services/solicitud.service';
import { environment } from '../../../../environments/environment';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatButtonModule,
    MatCardModule,
    MatIconModule,
    MatBadgeModule,
    MatChipsModule,
    MatFormFieldModule,
    MatInputModule
  ],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css'
})
export class DashboardComponent implements OnInit {
  nombreApp = environment.nombreApp;
  partidos: Partido[] = [];
  solicitudes: Solicitud[] = [];
  usoStorage: UsoStorage | null = null;
  cargando = true;
  editandoPartido: Partido | null = null;
  tituloEdit = '';
  fechaEdit = '';
  precioEdit = 0;
  guardandoEdicion = false;

  constructor(
    private authService: AuthService,
    private partidoService: PartidoService,
    private solicitudService: SolicitudService,
    public router: Router,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit() {
    this.cargarDatos();
  }

  cargarDatos() {
    this.partidoService.listarTodosPartidos().subscribe({
      next: (partidos) => {
        this.partidos = partidos;
        this.cargando = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.cargando = false;
        this.cdr.detectChanges();
      }
    });

    this.solicitudService.listarSolicitudes().subscribe({
      next: (solicitudes) => {
        this.solicitudes = solicitudes;
        this.cdr.detectChanges();
      }
    });

    this.partidoService.obtenerUsoStorage().subscribe({
      next: (uso) => {
        this.usoStorage = uso;
        this.cdr.detectChanges();
      }
    });
  }

  irASubirFotos(partidoId: number) {
    this.router.navigate(['/admin/subir-fotos'], { queryParams: { partido: partidoId } });
  }

  actualizarEstado(solicitud: Solicitud, estado: string) {
    this.solicitudService.actualizarEstado(solicitud.id, estado).subscribe({
      next: (actualizada) => {
        const idx = this.solicitudes.findIndex(s => s.id === solicitud.id);
        this.solicitudes[idx] = actualizada;
      }
    });
  }

  solicitudesNuevas(): number {
    return this.solicitudes.filter(s => s.estado === 'nueva').length;
  }

  logout() {
    this.authService.logout();
  }

  desactivarPartido(partidoId: number) {
    if (!confirm('¿Querés desactivar este partido? Va a dejar de verse en la galería pero podés reactivarlo después.')) return;

    this.partidoService.desactivarPartido(partidoId).subscribe({
      next: () => {
        const partido = this.partidos.find(p => p.id === partidoId);
        if (partido) {
          partido.activo = false;
          this.cdr.detectChanges();
        }
      },
      error: () => alert('Error al desactivar el partido')
    });
  }

  activarPartido(partidoId: number) {
    this.partidoService.activarPartido(partidoId).subscribe({
      next: () => {
        const partido = this.partidos.find(p => p.id === partidoId);
        if (partido) {
          partido.activo = true;
          this.cdr.detectChanges();
        }
      },
      error: () => alert('Error al activar el partido')
    });
  }

  eliminarPartido(partidoId: number) {
    if (!confirm('¿Seguro? Esta acción borra el partido y todas sus fotos definitivamente y no se puede deshacer.')) return;

    this.partidoService.eliminarDefinitivo(partidoId).subscribe({
      next: () => {
        this.partidos = this.partidos.filter(p => p.id !== partidoId);
        this.cdr.detectChanges();
      },
      error: () => alert('Error al eliminar el partido')
    });
  }

  eliminarSolicitud(solicitudId: number) {
    if (!confirm('¿Querés eliminar esta solicitud?')) return;

    this.solicitudService.eliminarSolicitud(solicitudId).subscribe({
      next: () => {
        this.solicitudes = this.solicitudes.filter(s => s.id !== solicitudId);
        this.cdr.detectChanges();
      },
      error: () => alert('Error al eliminar la solicitud')
    });
  }

  habilitarDescarga(solicitud: Solicitud) {
    this.solicitudService.habilitarDescarga(solicitud.id).subscribe({
      next: (actualizada) => {
        const idx = this.solicitudes.findIndex(s => s.id === solicitud.id);
        this.solicitudes[idx] = actualizada;
        this.cdr.detectChanges();
      },
      error: () => alert('Error al habilitar la descarga')
    });
  }

  deshabilitarDescarga(solicitud: Solicitud) {
    this.solicitudService.deshabilitarDescarga(solicitud.id).subscribe({
      next: (actualizada) => {
        const idx = this.solicitudes.findIndex(s => s.id === solicitud.id);
        this.solicitudes[idx] = actualizada;
        this.cdr.detectChanges();
      },
      error: () => alert('Error al deshabilitar la descarga')
    });
  }

  copiarLinkDescarga(solicitudId: number) {
    const url = `${window.location.origin}/descargas/${solicitudId}`;
    navigator.clipboard.writeText(url);
    alert('Link copiado al portapapeles');
  }

  abrirEdicion(partido: Partido) {
    this.editandoPartido = partido;
    this.tituloEdit = partido.titulo;
    this.fechaEdit = partido.fecha;
    this.precioEdit = partido.precio_por_foto;
    this.cdr.detectChanges();
  }

  cerrarEdicion() {
    this.editandoPartido = null;
    this.cdr.detectChanges();
  }

  guardarEdicion() {
    if (!this.editandoPartido || !this.tituloEdit || !this.fechaEdit) return;
    if (this.guardandoEdicion) return;

    this.guardandoEdicion = true;

    this.partidoService.editarPartido(this.editandoPartido.id, {
      titulo: this.tituloEdit,
      fecha: this.fechaEdit,
      precio_por_foto: this.precioEdit,
    }).subscribe({
      next: (actualizado) => {
        const idx = this.partidos.findIndex(p => p.id === actualizado.id);
        if (idx !== -1) {
          this.partidos[idx] = actualizado;
        }
        this.guardandoEdicion = false;
        this.editandoPartido = null;
        this.cdr.detectChanges();
      },
      error: () => {
        alert('Error al guardar los cambios');
        this.guardandoEdicion = false;
        this.cdr.detectChanges();
      }
    });
  }


}
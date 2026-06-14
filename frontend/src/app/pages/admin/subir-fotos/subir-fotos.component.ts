import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatIconModule } from '@angular/material/icon';
import { HttpEventType } from '@angular/common/http';
import { PartidoService, Partido } from '../../../core/services/partido.service';

interface ArchivoSubida {
  archivo: File;
  progreso: number;
  estado: 'pendiente' | 'subiendo' | 'listo' | 'error';
}

@Component({
  selector: 'app-subir-fotos',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatProgressBarModule,
    MatIconModule,
  ],
  templateUrl: './subir-fotos.component.html',
  styleUrl: './subir-fotos.component.css'
})
export class SubirFotosComponent implements OnInit {
  
  tituloPartido = '';
  fechaPartido = '';
  precioFoto = 0;

  
  partidoActual: Partido | null = null;
  archivos: ArchivoSubida[] = [];
  subiendoFotos = false;
  fotoActual = 0;
  creandoPartido = false;

  constructor(
    private partidoService: PartidoService,
    public router: Router,
    private route: ActivatedRoute,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit() {
    // Si venimos del dashboard con un partido ya creado, lo usamos
    const partidoId = this.route.snapshot.queryParams['partido'];
    if (partidoId) {
      this.partidoService.listarPartidos().subscribe({
        next: (partidos) => {
          this.partidoActual = partidos.find(p => p.id === +partidoId) || null;
          this.cdr.detectChanges();
        }
      });
    }
  }

  crearPartido() {
    if (!this.tituloPartido || !this.fechaPartido) return;
    if (this.creandoPartido) return;

    this.creandoPartido = true;
    this.cdr.detectChanges();

    this.partidoService.crearPartido({
      titulo: this.tituloPartido,
      fecha: this.fechaPartido,
      precio_por_foto: this.precioFoto,
    }).subscribe({
      next: (partido) => {
        setTimeout(() => {
          this.partidoActual = partido;
          this.creandoPartido = false;
          this.cdr.detectChanges();
        }, 0);
      },

      error: () => {
        setTimeout(() => {
          alert('Error al crear el partido');
          this.creandoPartido = false;
          this.cdr.detectChanges();
        }, 0);
      }
    });
  }

  onArchivosSeleccionados(event: any) {
    const files: FileList = event.target.files;
    const nuevos = Array.from(files).map(archivo => ({
      archivo,
      progreso: 0,
      estado: 'pendiente' as const,
    }));
    this.archivos = [...this.archivos, ...nuevos];
  }

  async subirTodas() {
    if (!this.partidoActual || this.archivos.length === 0) return;

    this.subiendoFotos = true;
    const pendientes = this.archivos.filter(a => a.estado === 'pendiente');

    // Subimos de a 3 en paralelo para no saturar la conexión
    for (let i = 0; i < pendientes.length; i += 3) {
      const grupo = pendientes.slice(i, i + 3);
      await Promise.all(grupo.map(a => this.subirUna(a)));
      this.fotoActual = Math.min(i + 3, pendientes.length);
      this.cdr.detectChanges();
    }

    this.subiendoFotos = false;
    this.cdr.detectChanges();

    setTimeout(() => {
      this.router.navigate(['/admin/dashboard']);
    }, 1500);
  }

  subirUna(item: ArchivoSubida): Promise<void> {
    return new Promise((resolve) => {
      item.estado = 'subiendo';

      this.partidoService.subirFoto(this.partidoActual!.id, item.archivo).subscribe({
        next: (event) => {
          if (event.type === HttpEventType.UploadProgress && event.total) {
            item.progreso = Math.round(100 * event.loaded / event.total);
            this.cdr.detectChanges();
          }
          if (event.type === HttpEventType.Response) {
            item.estado = 'listo';
            item.progreso = 100;
            this.cdr.detectChanges();
            resolve();
          }
        },
        error: () => {
          item.estado = 'error';
          this.cdr.detectChanges();
          resolve();
        }
      });
    });
  }

  removerArchivo(index: number) {
    this.archivos.splice(index, 1);
  }

  progresoTotal(): number {
    if (this.archivos.length === 0) return 0;
    const suma = this.archivos.reduce((acc, a) => acc + a.progreso, 0);
    return Math.round(suma / this.archivos.length);
  }

  fotosListas(): number {
    return this.archivos.filter(a => a.estado === 'listo').length;
  }

  volver() {
    if (this.partidoActual) {
      this.router.navigate(['/admin/dashboard']);
    } else {
      this.router.navigate(['/admin/dashboard']);
    }
  }
}
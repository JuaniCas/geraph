import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { PartidoService, Partido, Foto } from '../../core/services/partido.service';
import { environment } from '../../../environments/environment';
import { HostListener } from '@angular/core';

@Component({
  selector: 'app-galeria',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatIconModule,
  ],
  templateUrl: './galeria.component.html',
  styleUrl: './galeria.component.css'
})
export class GaleriaComponent implements OnInit {
  nombreApp = environment.nombreApp;
  tagline = environment.taglineApp;
  fotografoContacto = environment.fotografoContacto;
  fotografoInstagram = environment.fotografoInstagram;
  fotografoNombre = environment.fotografoNombre;
  developerNombre = environment.developerNombre;
  developerEmail = environment.developerEmail;

  partidos: Partido[] = [];
  partidoSeleccionado: Partido | null = null;
  fotos: Foto[] = [];
  fotosSeleccionadas: Set<number> = new Set();
  cargandoPartidos = true;
  cargandoFotos = false;
  fotoAmpliada: Foto | null = null;
  touchStartX = 0;
  touchEndX = 0;

  constructor(
    private partidoService: PartidoService,
    public router: Router,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit() {
    this.partidoService.listarPartidos().subscribe({
      next: (partidos) => {
        console.log('Partidos recibidos:', partidos);
        this.partidos = partidos;
        this.cargandoPartidos = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Error cargando partidos:', err);
        this.cargandoPartidos = false;
        this.cdr.detectChanges();
      }
    });
  }

  seleccionarPartido(partido: Partido) {
    this.partidoSeleccionado = partido;
    this.fotos = [];
    this.fotosSeleccionadas.clear();
    this.cargandoFotos = true;
    this.cdr.detectChanges();

    this.partidoService.listarFotos(partido.id).subscribe({
      next: (fotos) => {
        this.fotos = fotos;
        this.cargandoFotos = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.cargandoFotos = false;
        this.cdr.detectChanges();
      }
    });
  }

  toggleFoto(fotoId: number) {
    if (this.fotosSeleccionadas.has(fotoId)) {
      this.fotosSeleccionadas.delete(fotoId);
    } else {
      this.fotosSeleccionadas.add(fotoId);
    }
  }

  estaSeleccionada(fotoId: number): boolean {
    return this.fotosSeleccionadas.has(fotoId);
  }

  irASolicitud() {
    if (this.fotosSeleccionadas.size === 0) return;
    const ids = Array.from(this.fotosSeleccionadas).join(',');
    this.router.navigate(['/solicitud'], {
      queryParams: {
        fotos: ids,
        partido: this.partidoSeleccionado?.id
      }
    });
  }

  totalSeleccionado(): number {
    return this.fotosSeleccionadas.size * (this.partidoSeleccionado?.precio_por_foto || 0);
  }

  volverAPartidos() {
    this.partidoSeleccionado = null;
    this.fotos = [];
    this.fotosSeleccionadas.clear();
    this.cdr.detectChanges();
  }

  abrirFoto(foto: Foto) {
    this.fotoAmpliada = foto;
    history.pushState(null, '', location.href);
    this.cdr.detectChanges();
  }

  cerrarFoto() {
    this.fotoAmpliada = null;
    this.cdr.detectChanges();
  }

  toggleFotoDesdeModal(fotoId: number) {
    this.toggleFoto(fotoId);
    this.cdr.detectChanges();
  }

  onTouchStart(event: TouchEvent) {
    this.touchStartX = event.changedTouches[0].screenX;
  }

  onTouchEnd(event: TouchEvent) {
    this.touchEndX = event.changedTouches[0].screenX;
    this.detectarSwipe();
  }

  detectarSwipe() {
    const distancia = this.touchEndX - this.touchStartX;
    const umbralMinimo = 50;

    if (Math.abs(distancia) < umbralMinimo) return;

    if (distancia > 0) {
      this.fotoAnterior();
    } else {
      this.fotoSiguiente();
    }
  }

  fotoSiguiente() {
    if (!this.fotoAmpliada) return;
    const indiceActual = this.fotos.findIndex(f => f.id === this.fotoAmpliada!.id);
    if (indiceActual < this.fotos.length - 1) {
      this.fotoAmpliada = this.fotos[indiceActual + 1];
      this.cdr.detectChanges();
    }
  }

  fotoAnterior() {
    if (!this.fotoAmpliada) return;
    const indiceActual = this.fotos.findIndex(f => f.id === this.fotoAmpliada!.id);
    if (indiceActual > 0) {
      this.fotoAmpliada = this.fotos[indiceActual - 1];
      this.cdr.detectChanges();
    }
  }
  

  @HostListener('window:popstate', ['$event'])
  onPopState(event: PopStateEvent) {
    if (this.fotoAmpliada) {
      event.preventDefault();
      this.cerrarFoto();
      history.pushState(null, '', location.href);
    }
  }
}
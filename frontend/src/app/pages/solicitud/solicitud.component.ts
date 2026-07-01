import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { SolicitudService } from '../../core/services/solicitud.service';
import { PartidoService, Partido } from '../../core/services/partido.service';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-solicitud',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
  ],
  templateUrl: './solicitud.component.html',
  styleUrl: './solicitud.component.css'
})
export class SolicitudComponent implements OnInit {
  nombreApp = environment.nombreApp;
  nombreJugador = '';
  contacto = '';
  fotosIds: number[] = [];
  partido: Partido | null = null;
  enviando = false;
  enviada = false;
  error = '';

  constructor(
    private solicitudService: SolicitudService,
    private partidoService: PartidoService,
    private route: ActivatedRoute,
    public router: Router,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    const fotosParam = this.route.snapshot.queryParams['fotos'];
    const partidoId = this.route.snapshot.queryParams['partido'];

    if (fotosParam) {
      this.fotosIds = fotosParam.split(',').map(Number);
    }

    if (partidoId) {
      this.partidoService.listarPartidos().subscribe({
        next: (partidos) => {
          this.partido = partidos.find(p => p.id === +partidoId) || null;
          this.cdr.detectChanges();
        }
      });
    }
  }

  totalFotos(): number {
    return this.fotosIds.length * (this.partido?.precio_por_foto || 0);
  }

  enviarSolicitud() {
    if (!this.nombreJugador || !this.contacto) {
      this.error = 'Completá todos los campos';
      return;
    }

    const soloNumeros = this.contacto.replace(/\D/g, '');
    if (soloNumeros.length < 8) {
      this.error = 'Ingresá un número de WhatsApp válido';
      return;
    }


    this.enviando = true;
    this.error = '';

    this.solicitudService.crearSolicitud({
      nombre_jugador: this.nombreJugador,
      contacto: this.contacto,
      fotos_ids: this.fotosIds,
    }).subscribe({
      next: () => {
        setTimeout(() => {
          this.enviando = false;
          this.enviada = true;
          this.cdr.detectChanges();
        }, 0);
      },
      error: () => {
        setTimeout(() => {
          this.error = 'Hubo un error, intentá de nuevo';
          this.enviando = false;
          this.cdr.detectChanges();
        }, 0);
      }
    });
  }
}
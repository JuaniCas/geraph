import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface Partido {
  id: number;
  titulo: string;
  fecha: string;
  descripcion: string;
  precio_por_foto: number;
  total_fotos: number;
  activo: boolean;
}

export interface Foto {
  id: number;
  url_marca_agua: string;
  url_thumbnail: string;
  partido_id: number;
}

export interface UsoStorage {
  usado_bytes: number;
  usado_gb: number;
  limite_gb: number;
  porcentaje: number;
}

@Injectable({ providedIn: 'root' })
export class PartidoService {

  constructor(private http: HttpClient) {}

  listarPartidos(): Observable<Partido[]> {
    return this.http.get<Partido[]>(`${environment.apiUrl}/partidos/`);
  }

  listarFotos(partidoId: number): Observable<Foto[]> {
    return this.http.get<Foto[]>(`${environment.apiUrl}/partidos/${partidoId}/fotos`);
  }

  crearPartido(datos: Partial<Partido>): Observable<Partido> {
    return this.http.post<Partido>(`${environment.apiUrl}/partidos/`, datos);
  }

  subirFoto(partidoId: number, archivo: File): Observable<any> {
    const formData = new FormData();
    formData.append('archivo', archivo);
    return this.http.post(
      `${environment.apiUrl}/partidos/${partidoId}/fotos`,
      formData,
      { reportProgress: true, observe: 'events' }
    );
  }

  desactivarPartido(partidoId: number): Observable<any> {
    return this.http.delete(`${environment.apiUrl}/partidos/${partidoId}`);
  }

  listarTodosPartidos(): Observable<Partido[]> {
    return this.http.get<Partido[]>(`${environment.apiUrl}/partidos/todos`);
  }

  activarPartido(partidoId: number): Observable<any> {
    return this.http.patch(`${environment.apiUrl}/partidos/${partidoId}/activar`, {});
  }

  eliminarDefinitivo(partidoId: number): Observable<any> {
    return this.http.delete(`${environment.apiUrl}/partidos/${partidoId}/definitivo`);
  }

  obtenerUsoStorage(): Observable<UsoStorage> {
    return this.http.get<UsoStorage>(`${environment.apiUrl}/partidos/storage/uso`);
  }
}
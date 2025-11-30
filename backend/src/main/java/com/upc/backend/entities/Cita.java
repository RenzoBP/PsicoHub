package com.upc.backend.entities;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalTime;

@Entity
@Table(name = "citas")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class Cita {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_cita")
    private Long idCita;

    @Column(nullable = false)
    private Long codigo;

    @ManyToOne
    @JoinColumn(name = "paciente_id", referencedColumnName = "id_paciente")
    private Paciente paciente;

    @ManyToOne
    @JoinColumn(name = "psicologo_id", referencedColumnName = "id_psicologo")
    private Psicologo psicologo;

    @ManyToOne
    @JoinColumn(name = "especialidad_id", referencedColumnName = "id_especialidad")
    private Especialidad especialidad;

    @Column(nullable = false)
    private LocalTime hora;

    @Column(nullable = false)
    private Double precio;

    @Column(nullable = false)
    private String descripcion;

    @Column(nullable = false)
    private String estado = "pendiente";
}

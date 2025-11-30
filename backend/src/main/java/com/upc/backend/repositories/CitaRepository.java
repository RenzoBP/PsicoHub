package com.upc.backend.repositories;

import com.upc.backend.entities.Cita;
import com.upc.backend.entities.Especialidad;
import com.upc.backend.entities.Psicologo;
import com.upc.backend.entities.Paciente;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface CitaRepository extends JpaRepository<Cita, Long> {
    @Query("SELECT c FROM Cita c WHERE c.especialidad.nombre = :especialidad AND c.estado = 'pendiente'")
    List<Cita> listarPorEspecialidad(Especialidad especialidad);

    @Query("SELECT c FROM Cita c WHERE c.psicologo.nombre = :psicologo AND c.estado = 'pendiente'")
    List<Cita> listarPorPsicologo(Psicologo psicologo);

    @Query("SELECT c FROM Cita c WHERE c.paciente.nombre = :paciente AND c.estado = 'pendiente'")
    List<Cita> listarPorPaciente(Paciente paciente);

    Cita findByCodigo(Long codigo);
}

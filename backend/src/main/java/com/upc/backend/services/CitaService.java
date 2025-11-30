package com.upc.backend.services;

import com.upc.backend.dtos.CitaDTO;
import com.upc.backend.entities.Cita;
import com.upc.backend.entities.Especialidad;
import com.upc.backend.entities.Paciente;
import com.upc.backend.entities.Psicologo;
import com.upc.backend.interfaces.ICitaService;
import com.upc.backend.repositories.CitaRepository;
import com.upc.backend.repositories.EspecialidadRepository;
import com.upc.backend.repositories.PacienteRepository;
import com.upc.backend.repositories.PsicologoRepository;
import org.modelmapper.ModelMapper;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

@Service
public class CitaService implements ICitaService {
    @Autowired
    private CitaRepository citaRepository;
    @Autowired
    private EspecialidadRepository especialidadRepository;
    @Autowired
    private PsicologoRepository psicologoRepository;
    @Autowired
    private PacienteRepository pacienteRepository;

    @Autowired
    private ModelMapper modelMapper;

    @Override
    public CitaDTO registrar(CitaDTO citaDTO) {
        Paciente paciente = pacienteRepository.findById(citaDTO.getPaciente().getIdPaciente())
                .orElseThrow(() -> new RuntimeException("Paciente no encontrado"));
        Psicologo psicologo = psicologoRepository.findById(citaDTO.getPsicologo().getIdPsicologo())
                .orElseThrow(() -> new RuntimeException("Psicólogo no encontrado"));
        Especialidad especialidad = especialidadRepository.findById(citaDTO.getEspecialidad().getIdEspecialidad())
                .orElseThrow(() -> new RuntimeException("Especialidad no encontrada"));

        if (paciente == null) throw new RuntimeException("Paciente no encontrado");
        if (psicologo == null) throw new RuntimeException("Psicólogo no encontrado");
        if (especialidad == null) throw new RuntimeException("Especialidad no encontrada");

        // Usa ModelMapper para mapear el resto de campos
        Cita cita = modelMapper.map(citaDTO, Cita.class);

        // Asignar relaciones manualmente
        cita.setPaciente(paciente);
        cita.setPsicologo(psicologo);
        cita.setEspecialidad(especialidad);

        cita.setIdCita(null); // Forzar autogeneración

        Cita guardada = citaRepository.save(cita);

        return modelMapper.map(guardada, CitaDTO.class);
    }
}
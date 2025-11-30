package com.upc.backend.interfaces;

import com.upc.backend.dtos.CitaDTO;
import com.upc.backend.dtos.EspecialidadDTO;
import com.upc.backend.dtos.PacienteDTO;
import com.upc.backend.dtos.PsicologoDTO;

import java.util.List;

public interface ICitaService {
    public CitaDTO registrar(CitaDTO citaDTO);
}

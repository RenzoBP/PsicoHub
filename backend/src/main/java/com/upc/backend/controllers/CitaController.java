package com.upc.backend.controllers;

import com.upc.backend.dtos.CitaDTO;
import com.upc.backend.services.CitaService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

import static org.springframework.security.authorization.AuthorityReactiveAuthorizationManager.hasRole;

@RestController
@CrossOrigin(origins = "http://localhost:4200", allowCredentials = "true", exposedHeaders = "Authorization")
@RequestMapping("/api/cita")
public class CitaController {
    @Autowired
    private CitaService citaService;

    @PreAuthorize("hasAnyRole('PACIENTE','PSICOLOGO', 'ADMIN')")
    @PostMapping("/registrar")
    public ResponseEntity<?> registrar(@RequestBody CitaDTO citaDTO) {
        try {
            CitaDTO created = citaService.registrar(citaDTO);
            return ResponseEntity.ok(created);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(Map.of(
                            "success", false,
                            "error", "Error de validación",
                            "message", e.getMessage(),
                            "timestamp", LocalDateTime.now().toString()
                    ));
        }
    }
}

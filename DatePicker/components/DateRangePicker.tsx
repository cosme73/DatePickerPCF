import * as React from "react";
import { useState, useRef, useEffect } from "react";
// createPortal nos permite renderizar el calendario fuera del contenedor principal de PCF
// directamente en el document.body. Esto evita que el calendario sea ocultado
// si el contenedor de Power Apps es muy pequeño (overflow: hidden).
import { createPortal } from "react-dom";
import {
    format, addMonths, subMonths, startOfMonth, endOfMonth, eachDayOfInterval,
    isSameDay, isWithinInterval, isBefore, isAfter, setHours, setMinutes, startOfDay
} from "date-fns";
import { es } from "date-fns/locale";

export interface IDateRangePickerProps {
    startDate?: Date;
    endDate?: Date;
    allowTime: boolean;
    isDisabled: boolean;
    allocatedWidth: number;
    allocatedHeight: number;
    placeholder?: string;
    minDate?: Date;
    maxDate?: Date;
    onChange: (start?: Date, end?: Date, textStr?: string) => void;
}

export const DateRangePicker: React.FC<IDateRangePickerProps> = ({
    startDate,
    endDate,
    allowTime,
    isDisabled,
    allocatedWidth,
    allocatedHeight,
    placeholder,
    minDate,
    maxDate,
    onChange
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [currentMonth, setCurrentMonth] = useState(startDate || new Date());
    
    // Estado interno mientras el calendario está abierto
    const [selStart, setSelStart] = useState<Date | undefined>(startDate);
    const [selEnd, setSelEnd] = useState<Date | undefined>(endDate);
    const [hoverDate, setHoverDate] = useState<Date | undefined>(undefined);
    
    // Estado interno para las horas y minutos
    const [startHour, setStartHour] = useState(startDate ? format(startDate, "HH") : "00");
    const [startMin, setStartMin] = useState(startDate ? format(startDate, "mm") : "00");
    const [endHour, setEndHour] = useState(endDate ? format(endDate, "HH") : "23");
    const [endMin, setEndMin] = useState(endDate ? format(endDate, "mm") : "59");

    const containerRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLDivElement>(null);
    const popoverRef = useRef<HTMLDivElement>(null);
    
    // Estado para guardar la fuente (font) configurada en Power Apps
    const [computedFont, setComputedFont] = useState("inherit");
    
    // Estado para guardar las coordenadas top y left donde se dibujará el calendario
    const [popoverCoords, setPopoverCoords] = useState({ top: 0, left: 0 });

    // Extraer la fuente de Power Apps del contenedor cuando el componente carga
    useEffect(() => {
        if (containerRef.current) {
            const font = window.getComputedStyle(containerRef.current).fontFamily;
            if (font) setComputedFont(font);
        }
    }, []);

    // Sincronizar propiedades externas cuando se cierra y el usuario recibe nuevos datos de PCF
    useEffect(() => {
        if (!isOpen) {
            setSelStart(startDate);
            setSelEnd(endDate);
            if (startDate) {
                setCurrentMonth(startDate);
                setStartHour(format(startDate, "HH"));
                setStartMin(format(startDate, "mm"));
            }
            if (endDate) {
                setEndHour(format(endDate, "HH"));
                setEndMin(format(endDate, "mm"));
            }
        }
    }, [startDate, endDate, isOpen]);

    // Cuando el calendario se abre, calculamos las coordenadas exactas del elemento input
    // para fijar la posición (fixed) del calendario justo debajo (rect.bottom) de este.
    useEffect(() => {
        if (isOpen && inputRef.current) {
            const rect = inputRef.current.getBoundingClientRect();
            setPopoverCoords({
                top: rect.bottom, 
                left: rect.left
            });
        }
    }, [isOpen]);

    useEffect(() => {
        const handleScroll = (e: Event) => {
            // Evitar cerrar si el evento de scroll viene desde dentro del calendario
            if (popoverRef.current && popoverRef.current.contains(e.target as Node)) {
                return;
            }
            if (isOpen) setIsOpen(false);
        };
        const handleClickOutside = (e: MouseEvent) => {
            if (
                inputRef.current && !inputRef.current.contains(e.target as Node) &&
                popoverRef.current && !popoverRef.current.contains(e.target as Node)
            ) {
                setIsOpen(false);
            }
        };

        if (isOpen) {
            window.addEventListener("scroll", handleScroll, true);
        }
        document.addEventListener("mousedown", handleClickOutside);
        
        return () => {
            window.removeEventListener("scroll", handleScroll, true);
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [isOpen]);

    const toggleOpen = () => {
        if (!isDisabled) setIsOpen(!isOpen);
    };

    const handleDayClick = (day: Date) => {
        if (!selStart || (selStart && selEnd)) {
            // Empieza una nueva selección de rango
            setSelStart(day);
            setSelEnd(undefined);
        } else if (selStart && !selEnd) {
            // El usuario elije la fecha final. Asegurarse que no sea menor a la de inicio.
            if (isBefore(day, selStart)) {
                setSelStart(day); // Reinicia inicio
            } else if (isSameDay(day, selStart)) {
                // Doble clic: ignoramos el segundo clic en la misma fecha para evitar asignar un fin por accidente
                setSelEnd(undefined);
            } else {
                setSelEnd(day);
            }
        }
    };

    const generateDisplayString = (start?: Date, end?: Date) => {
        if (!start) return "";
        const formatStr = allowTime ? "dd/MM/yyyy HH:mm" : "dd/MM/yyyy";
        const startStr = format(start, formatStr);
        if (end) {
            const endStr = format(end, formatStr);
            return `${startStr} - ${endStr}`;
        }
        return startStr;
    };

    const applySelection = () => {
        let finalStart = selStart;
        let finalEnd = selEnd;

        if (finalStart && allowTime) {
            finalStart = setMinutes(setHours(finalStart, parseInt(startHour, 10)), parseInt(startMin, 10));
        }
        if (finalEnd && allowTime) {
            finalEnd = setMinutes(setHours(finalEnd, parseInt(endHour, 10)), parseInt(endMin, 10));
        }

        onChange(finalStart, finalEnd, generateDisplayString(finalStart, finalEnd));
        setIsOpen(false);
    };

    const clearSelection = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (isDisabled) return;
        onChange(undefined, undefined, "");
        setIsOpen(false);
    };

    const renderMonth = () => {
        const start = startOfMonth(currentMonth);
        const end = endOfMonth(currentMonth);
        const days = eachDayOfInterval({ start, end });
        
        // date-fns trae domingo como primer día, ajustando para hispanos donde el lunes suele ser el primero.
        // Locale "es": Lunes = 1, Domingo = 0
        let firstDayOfWeek = start.getDay(); 
        if (firstDayOfWeek === 0) firstDayOfWeek = 7; // Convertimos domingo a 7 para matemática
        
        const blanks = Array.from({ length: firstDayOfWeek - 1 }).map((_, i) => <div key={`blank-${i}`} className="pcf-dp-day empty"></div>);

        return (
            <div className="pcf-dp-grid">
                {["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"].map(d => <div key={d} className="pcf-dp-weekday">{d}</div>)}
                {blanks}
                {days.map(day => {
                    let isSelected = false;
                    let isRange = false;
                    const isToday = isSameDay(day, new Date());
                    
                    const dayStart = startOfDay(day);
                    const disabledDay = (minDate && dayStart < startOfDay(minDate)) || (maxDate && dayStart > startOfDay(maxDate));
                    
                    if (selStart && isSameDay(day, selStart)) isSelected = true;
                    if (selEnd && isSameDay(day, selEnd)) isSelected = true;
                    
                    if (selStart && selEnd && isWithinInterval(day, { start: selStart, end: selEnd })) {
                        isRange = true;
                    } else if (selStart && !selEnd && hoverDate && isWithinInterval(day, { start: selStart, end: hoverDate })) {
                        if (isAfter(hoverDate, selStart) || isSameDay(hoverDate, selStart)) isRange = true;
                    }

                    return (
                        <div 
                            key={day.toString()} 
                            className={`pcf-dp-day ${isSelected ? "selected" : ""} ${isRange && !isSelected ? "in-range" : ""} ${isToday && !isSelected ? "today" : ""} ${disabledDay ? "disabled" : ""}`}
                            onClick={disabledDay ? undefined : () => handleDayClick(day)}
                            onMouseEnter={disabledDay ? undefined : () => setHoverDate(day)}
                        >
                            {format(day, "d")}
                        </div>
                    );
                })}
            </div>
        );
    };

    const renderTimePicker = (label: string, h: string, m: string, setH: (v: string) => void, setM: (v: string) => void, disabled: boolean) => {
        if (!allowTime) return null;
        return (
            <div className={`pcf-dp-time-col ${disabled ? "disabled" : ""}`}>
                <span className="pcf-dp-time-label">{label}</span>
                <div className="pcf-dp-time-inputs">
                    <input type="number" min="0" max="23" value={h} onChange={e => {
                        let val = e.target.value;
                        if (val.length === 1) val = "0" + val;
                        setH(val);
                    }} disabled={disabled} />
                    <span>:</span>
                    <input type="number" min="0" max="59" value={m} onChange={e => {
                        let val = e.target.value;
                        if (val.length === 1) val = "0" + val;
                        setM(val);
                    }} disabled={disabled} />
                </div>
            </div>
        );
    };

    const containerStyle: React.CSSProperties = {};
    if (allocatedWidth > 0) containerStyle.width = `${allocatedWidth}px`;
    else containerStyle.width = "100%";
    if (allocatedHeight > 0) containerStyle.height = `${allocatedHeight}px`;
    else containerStyle.height = "100%";

    return (
        <div className={`pcf-dp-container ${isDisabled ? "disabled" : ""}`} ref={containerRef} style={containerStyle}>
            <div className="pcf-dp-input-wrapper" onClick={toggleOpen} ref={inputRef}>
                <input 
                    type="text" 
                    readOnly 
                    value={generateDisplayString(startDate, endDate)} 
                    placeholder={placeholder || "Seleccione rango de fechas"}
                    disabled={isDisabled}
                />
            </div>

            {/* 
                createPortal inyecta el calendario en el body de la página, "sacándolo" del 
                contenedor de PCF, previniendo que se recorte gráficamente si el input es pequeño.
                Se usa position: fixed calculado previamente para anclarlo visualmente al input.
            */}
            {isOpen && createPortal(
                <div 
                    className="pcf-dp-popover" 
                    ref={popoverRef}
                    style={{ 
                        position: "fixed", 
                        // Sumamos +8px para darle un pequeño margen de separación
                        top: `${popoverCoords.top + 8}px`, 
                        left: `${popoverCoords.left}px`,
                        fontFamily: computedFont
                    }}
                >
                    <div className="pcf-dp-header">
                        <button onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}>&lt;</button>
                        <span>{format(currentMonth, "MMMM yyyy", { locale: es })}</span>
                        <button onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}>&gt;</button>
                    </div>
                    
                    {renderMonth()}

                    {allowTime && (
                        <div className="pcf-dp-time-section">
                            {renderTimePicker("Desde", startHour, startMin, setStartHour, setStartMin, !selStart)}
                            {renderTimePicker("Hasta", endHour, endMin, setEndHour, setEndMin, !selEnd)}
                        </div>
                    )}

                    <div className="pcf-dp-actions">
                        <button className="pcf-dp-btn-cancel" onClick={() => setIsOpen(false)}>Cancelar</button>
                        <button className="pcf-dp-btn-apply" onClick={applySelection} disabled={!selStart}>Aplicar</button>
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
};

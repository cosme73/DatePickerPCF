import * as React from "react";
import { useState, useRef, useEffect } from "react";
import {
    format, addMonths, subMonths, startOfMonth, endOfMonth, eachDayOfInterval,
    isSameDay, isWithinInterval, isBefore, isAfter, setHours, setMinutes
} from "date-fns";
import { es } from "date-fns/locale";

export interface IDateRangePickerProps {
    startDate?: Date;
    endDate?: Date;
    allowTime: boolean;
    isDisabled: boolean;
    allocatedWidth: number;
    allocatedHeight: number;
    onChange: (start?: Date, end?: Date) => void;
}

export const DateRangePicker: React.FC<IDateRangePickerProps> = ({
    startDate,
    endDate,
    allowTime,
    isDisabled,
    allocatedWidth,
    allocatedHeight,
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

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

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
            } else {
                setSelEnd(day);
            }
        }
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

        onChange(finalStart, finalEnd);
        setIsOpen(false);
    };

    const clearSelection = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (isDisabled) return;
        onChange(undefined, undefined);
        setIsOpen(false);
    };

    const getDisplayValue = () => {
        if (!startDate) return "";
        const formatStr = allowTime ? "dd/MM/yyyy HH:mm" : "dd/MM/yyyy";
        const startStr = format(startDate, formatStr);
        if (endDate) {
            const endStr = format(endDate, formatStr);
            return `${startStr} - ${endStr}`;
        }
        return startStr;
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
                            className={`pcf-dp-day ${isSelected ? "selected" : ""} ${isRange && !isSelected ? "in-range" : ""} ${isToday && !isSelected ? "today" : ""}`}
                            onClick={() => handleDayClick(day)}
                            onMouseEnter={() => setHoverDate(day)}
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
            <div className="pcf-dp-input-wrapper" onClick={toggleOpen}>
                <input 
                    type="text" 
                    readOnly 
                    value={getDisplayValue()} 
                    placeholder="Seleccione rango de fechas"
                    disabled={isDisabled}
                />
                {!isDisabled && (startDate || endDate) && (
                    <button className="pcf-dp-clear" onClick={clearSelection}>✕</button>
                )}
            </div>

            {isOpen && (
                <div className="pcf-dp-popover">
                    <div className="pcf-dp-header">
                        <button onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}>&lt;</button>
                        <span>{format(currentMonth, "MMMM yyyy", { locale: es })}</span>
                        <button onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}>&gt;</button>
                    </div>
                    
                    {renderMonth()}

                    {allowTime && (
                        <div className="pcf-dp-time-section">
                            {renderTimePicker("Inicio", startHour, startMin, setStartHour, setStartMin, !selStart)}
                            {renderTimePicker("Fin", endHour, endMin, setEndHour, setEndMin, !selEnd)}
                        </div>
                    )}

                    <div className="pcf-dp-actions">
                        <button className="pcf-dp-btn-cancel" onClick={() => setIsOpen(false)}>Cancelar</button>
                        <button className="pcf-dp-btn-apply" onClick={applySelection} disabled={!selStart}>Aplicar</button>
                    </div>
                </div>
            )}
        </div>
    );
};

import { IInputs, IOutputs } from "./generated/ManifestTypes";
import * as React from "react";
import { createRoot, Root } from "react-dom/client";
import { DateRangePicker, IDateRangePickerProps } from "./components/DateRangePicker";

export class DatePicker implements ComponentFramework.StandardControl<IInputs, IOutputs> {
    private _container: HTMLDivElement;
    private _notifyOutputChanged: () => void;
    private _startDate: Date | undefined;
    private _endDate: Date | undefined;
    private _prevTriggerReset = false;
    private _root: Root;

    constructor() {
        // Empty
    }

    public init(
        context: ComponentFramework.Context<IInputs>,
        notifyOutputChanged: () => void,
        state: ComponentFramework.Dictionary,
        container: HTMLDivElement
    ): void {
        this._container = container;
        this._notifyOutputChanged = notifyOutputChanged;
        
        // --- CRITICAL FIX FOR HEIGHT ---
        context.mode.trackContainerResize(true);
        this._container.style.display = "flex";
        this._container.style.alignItems = "stretch";
        
        this._root = createRoot(this._container);
    }

    public updateView(context: ComponentFramework.Context<IInputs>): void {
        // Cast to any since PCF test harness sometimes passes string 'true' / 'false' at runtime for TwoOptions
        const rawReset = context.parameters.triggerReset?.raw as unknown;
        const triggerReset = rawReset === true || rawReset === "true" || rawReset === "1";
        
        const rawAllow = context.parameters.allowTime?.raw as unknown;
        const allowTime = rawAllow === true || rawAllow === "true" || rawAllow === "1";
        
        const isControlDisabled = context.mode.isControlDisabled;
        const placeholderRaw = context.parameters.placeholder?.raw;
        const placeholderText = placeholderRaw ? placeholderRaw : undefined;

        const minDateParam = context.parameters.minDate?.raw;
        const maxDateParam = context.parameters.maxDate?.raw;
        const minDate = minDateParam ? minDateParam : undefined;
        const maxDate = maxDateParam ? maxDateParam : undefined;

        // Reset check: Edge detection (false -> true)
        if (triggerReset && !this._prevTriggerReset) {
            this._startDate = undefined;
            this._endDate = undefined;
            this._notifyOutputChanged();
        }
        this._prevTriggerReset = triggerReset;

        const props: IDateRangePickerProps = {
            startDate: this._startDate,
            endDate: this._endDate,
            allowTime: allowTime,
            isDisabled: isControlDisabled,
            allocatedWidth: context.mode.allocatedWidth,
            allocatedHeight: context.mode.allocatedHeight,
            placeholder: placeholderText,
            minDate: minDate,
            maxDate: maxDate,
            onChange: (start?: Date, end?: Date) => {
                this._startDate = start;
                this._endDate = end;
                this._notifyOutputChanged();
            }
        };

        this._root.render(React.createElement(DateRangePicker, props));
    }

    public getOutputs(): IOutputs {
        return {
            startDate: this._startDate,
            endDate: this._endDate
        };
    }

    public destroy(): void {
        this._root.unmount();
    }
}

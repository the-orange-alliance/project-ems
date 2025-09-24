import { ColorPicker, Input, Space, Typography } from "antd";
import SettingsRow from "./settings-row.js";
import { AggregationColor } from "antd/es/color-picker/color.js";

interface ColorRowProps {
    title: string;
    value?: string;
    defaultValue?: any;
    disabled?: boolean;
    onChange?: (newValue: string) => void;
}

const ColorRow: React.FC<ColorRowProps> = ({ title, defaultValue, disabled, onChange, value}) => {

    const handleChange = (_: AggregationColor, cssColor: string) => {
        if (onChange) {
            onChange(cssColor);
        }
    }

    return (
        <SettingsRow
            title={title}
            inputComponent={
                <ColorPicker defaultValue={defaultValue} value={value} onChange={handleChange} disabled={disabled} showText allowClear />
            }
        />
    );
}

export default ColorRow;
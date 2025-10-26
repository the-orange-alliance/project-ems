import { Input, Space, Typography } from "antd";
import SettingsRow from "./settings-row.js";
import { useState } from "react";


interface InputRowProps {
    title: string;
    value?: any;
    defaultValue?: any;
    disabled?: boolean;
    validator?: (value: any | null) => true | {status: 'error' | 'warning', message: string};
    onChange?: (newValue: any | null) => void;
}

const InputRow: React.FC<InputRowProps> = ({ title, defaultValue, disabled, onChange, validator, value}) => {

    const [valid, setValid] = useState(true);
    const [validState, setValidState] = useState<'error' | 'warning'>('error');
    const [validMessage, setValidMessage] = useState<string>('');
    
    const handleChange = (newValue: any | null) => {
        if (onChange) {
            onChange(newValue);
        }
        if (validator) {
            const isValid = validator(newValue);
            if (isValid !== true) {
                setValid(false);
                setValidState(isValid.status);
                setValidMessage(isValid.message);
            }
        }
    }

    return (
        <SettingsRow
            title={title}
            inputComponent={
                <Space direction="vertical" style={{ width: '100%' }}>
                    <Input value={value}
                        defaultValue={defaultValue}
                        disabled={disabled}
                        status={!valid ? validState : undefined}
                        onChange={(e) => handleChange(e.target.value)}
                    />
                    {!valid && 
                        <Typography.Text type={validState === 'error' ? 'danger' : 'warning'}> 
                            {validMessage}
                        </Typography.Text>
                    }
                </Space>
            }
        />
    );
}

export default InputRow;
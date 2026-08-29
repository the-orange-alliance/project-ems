import { FC } from 'react';
import { notification, Button } from 'antd';
import { useModal } from '@ebay/nice-modal-react';
import { ErrorDialog } from 'src/components/dialogs/error-dialog.js';

/**
 * The goal is to have the following
 * const { showSnackbar, Snackbar } = useSnackbar();
 */
interface UseSnackbarResult {
  showSnackbar: (msg: string, errorDetail?: unknown) => void;
  showErrorSnackbar: (context: string, error: unknown) => void;
  AppSnackbar: FC;
}

type SnackbarHook = () => UseSnackbarResult;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === 'object';

const toStringSafe = (value: unknown): string => {
  if (typeof value === 'string') return value;
  if (value instanceof Error) {
    return `${value.name}: ${value.message}`;
  }

  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
};

const formatDetail = (detail: unknown): string => {
  if (typeof detail === 'string') return detail;
  if (detail instanceof Error) {
    return JSON.stringify(
      {
        name: detail.name,
        message: detail.message,
        cause: detail.cause,
        stack: detail.stack
      },
      null,
      2
    );
  }

  try {
    return JSON.stringify(detail, null, 2);
  } catch {
    return toStringSafe(detail);
  }
};

const getErrorSummary = (error: unknown): string => {
  if (error instanceof Error) {
    if (isRecord(error) && typeof error.status === 'number') {
      const statusText =
        typeof error.statusText === 'string' && error.statusText.length > 0
          ? ` ${error.statusText}`
          : '';
      return `HTTP ${error.status}${statusText}: ${error.message}`;
    }
    return `${error.name}: ${error.message}`;
  }

  if (isRecord(error) && typeof error.message === 'string') {
    return error.message;
  }

  return toStringSafe(error);
};

const getErrorDetailPayload = (error: unknown): unknown => {
  if (!isRecord(error)) return error;

  const payload = error.payload;
  if (payload !== undefined) {
    return {
      response: {
        status: typeof error.status === 'number' ? error.status : undefined,
        statusText:
          typeof error.statusText === 'string' ? error.statusText : undefined,
        url: typeof error.url === 'string' ? error.url : undefined
      },
      payload
    };
  }

  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      cause: error.cause,
      stack: error.stack,
      response: isRecord(error.response)
        ? {
            status:
              typeof error.response.status === 'number'
                ? error.response.status
                : undefined,
            statusText:
              typeof error.response.statusText === 'string'
                ? error.response.statusText
                : undefined,
            url:
              typeof error.response.url === 'string'
                ? error.response.url
                : undefined
          }
        : undefined
    };
  }

  return error;
};

const ModalButton: FC<{ detail: unknown }> = ({ detail }) => {
  const errorDialog = useModal(ErrorDialog);
  const handleClick = () =>
    errorDialog.show({
      message: formatDetail(detail ?? 'No detail available.')
    });
  return (
    <Button type='link' size='small' onClick={handleClick}>
      Show
    </Button>
  );
};

export const useSnackbar: SnackbarHook = () => {
  const showSnackbar = (msg: string, detail?: unknown) => {
    notification.open({
      message: msg,
      duration: 5,
      btn: detail !== undefined ? <ModalButton detail={detail} /> : undefined
    });
  };

  const showErrorSnackbar = (context: string, error: unknown) => {
    const summary = getErrorSummary(error);
    notification.open({
      message: context,
      description: summary,
      duration: 8,
      btn: <ModalButton detail={getErrorDetailPayload(error)} />
    });
  };

  // antd's notification renders via its own portal, so there's nothing to mount here.
  const AppSnackbar: FC = () => null;

  return { showSnackbar, showErrorSnackbar, AppSnackbar };
};

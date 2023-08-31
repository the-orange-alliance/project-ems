import { FieldControlPacket } from '../FieldControl.js';

const RED_BLINKIN_CHANNEL = 0;
const BLUE_BLINKIN_CHANNEL = 1;
const AUDIENCE_BLINKIN_CHANNEL = 2;

export enum BlinkinPattern {
  COLOR_1_HB_FAST = 1535,
  COLOR_1_HB_MED = 1525,
  COLOR_1_HB_SLOW = 1515,
  COLOR_2_HB_FAST = 1635,
  COLOR_2_HB_MED = 1625,
  COLOR_2_HB_SLOW = 1615,
  COLOR_AQUA = 1905,
  COLOR_BLACK = 1995,
  COLOR_BLUE = 1935,
  COLOR_BLUE_GREEN = 1895,
  COLOR_BLUE_VIOLET = 1945,
  COLOR_DARK_BLUE = 1925,
  COLOR_DARK_GRAY = 1985,
  COLOR_DARK_GREEN = 1875,
  COLOR_DARK_RED = 1795,
  COLOR_FIRE = 1215,
  COLOR_GOLD = 1835,
  COLOR_GRAY = 1975,
  COLOR_GREEN = 1885,
  COLOR_LAWN_GREEN = 1855,
  COLOR_LIME = 1865,
  COLOR_ORANGE = 1825,
  COLOR_PINK = 1785,
  COLOR_PURPLE = 1955,
  COLOR_RED = 1805,
  COLOR_RED_ORANGE = 1815,
  COLOR_SKY_BLUE = 1915,
  COLOR_VIOLET = 1955,
  COLOR_WHITE = 1965,
  COLOR_YELLOW = 1845,
  COLOR_WAVES_RAINBOW = 1275,
}

export const setLEDPattern = (pulseWidth: number): FieldControlPacket => {
  const packet = LED_EMPTY;
  packet.messages[0].parameters.pulsewidth = pulseWidth;
  packet.messages[1].parameters.pulsewidth = pulseWidth;
  packet.messages[2].parameters.pulsewidth = pulseWidth;
  return packet;
};

export const LED_PRESTART: FieldControlPacket = {
  messages: [
    {
      hub: 0,
      function: 'servo',
      parameters: {
        port: RED_BLINKIN_CHANNEL,
        pulsewidth: BlinkinPattern.COLOR_YELLOW
      }
    },
    {
      hub: 0,
      function: 'servo',
      parameters: {
        port: BLUE_BLINKIN_CHANNEL,
        pulsewidth: BlinkinPattern.COLOR_YELLOW
      }
    },
    {
      hub: 0,
      function: 'servo',
      parameters: {
        port: AUDIENCE_BLINKIN_CHANNEL,
        pulsewidth: BlinkinPattern.COLOR_YELLOW
      }
    }
  ]
};
export const LED_ALLCLEAR: FieldControlPacket = {
  messages: [
    {
      hub: 0,
      function: 'servo',
      parameters: {
        port: RED_BLINKIN_CHANNEL,
        pulsewidth: BlinkinPattern.COLOR_GREEN
      }
    },
    {
      hub: 0,
      function: 'servo',
      parameters: {
        port: BLUE_BLINKIN_CHANNEL,
        pulsewidth: BlinkinPattern.COLOR_GREEN
      }
    },
    {
      hub: 0,
      function: 'servo',
      parameters: {
        port: AUDIENCE_BLINKIN_CHANNEL,
        pulsewidth: BlinkinPattern.COLOR_GREEN
      }
    }
  ]
};
export const LED_FIELDFAULT: FieldControlPacket = {
  messages: [
    {
      hub: 0,
      function: 'servo',
      parameters: {
        port: RED_BLINKIN_CHANNEL,
        pulsewidth: BlinkinPattern.COLOR_RED
      }
    },
    {
      hub: 0,
      function: 'servo',
      parameters: {
        port: BLUE_BLINKIN_CHANNEL,
        pulsewidth: BlinkinPattern.COLOR_RED
      }
    },
    {
      hub: 0,
      function: 'servo',
      parameters: {
        port: AUDIENCE_BLINKIN_CHANNEL,
        pulsewidth: BlinkinPattern.COLOR_RED
      }
    }
  ]
};
export const LED_IDLE: FieldControlPacket = {
  messages: [
    {
      hub: 0,
      function: 'servo',
      parameters: {
        port: RED_BLINKIN_CHANNEL,
        pulsewidth: BlinkinPattern.COLOR_WAVES_RAINBOW
      }
    },
    {
      hub: 0,
      function: 'servo',
      parameters: {
        port: BLUE_BLINKIN_CHANNEL,
        pulsewidth: BlinkinPattern.COLOR_WAVES_RAINBOW
      }
    },
    {
      hub: 0,
      function: 'servo',
      parameters: {
        port: AUDIENCE_BLINKIN_CHANNEL,
        pulsewidth: BlinkinPattern.COLOR_WAVES_RAINBOW
      }
    }
  ]
};
export const LED_COUNTDOWN: FieldControlPacket = {
  messages: [
    {
      hub: 0,
      function: 'servo',
      parameters: {
        port: RED_BLINKIN_CHANNEL,
        pulsewidth: BlinkinPattern.COLOR_PURPLE
      }
    },
    {
      hub: 0,
      function: 'servo',
      parameters: {
        port: BLUE_BLINKIN_CHANNEL,
        pulsewidth: BlinkinPattern.COLOR_PURPLE
      }
    },
    {
      hub: 0,
      function: 'servo',
      parameters: {
        port: AUDIENCE_BLINKIN_CHANNEL,
        pulsewidth: BlinkinPattern.COLOR_PURPLE
      }
    }
  ]
};
export const LED_DISABLE: FieldControlPacket = {
  messages: [
    {
      hub: 0,
      function: 'servo',
      parameters: {
        port: RED_BLINKIN_CHANNEL,
        pulsewidth: 1995
      }
    },
    {
      hub: 0,
      function: 'servo',
      parameters: {
        port: BLUE_BLINKIN_CHANNEL,
        pulsewidth: 1995
      }
    },
    {
      hub: 0,
      function: 'servo',
      parameters: {
        port: AUDIENCE_BLINKIN_CHANNEL,
        pulsewidth: 1995
      }
    }
  ]
};

export const LED_CARBON: FieldControlPacket = {
  messages: [
    {
      hub: 0,
      function: 'servo',
      parameters: {
        port: RED_BLINKIN_CHANNEL,
        pulsewidth: BlinkinPattern.COLOR_WHITE
      }
    },
    {
      hub: 0,
      function: 'servo',
      parameters: {
        port: BLUE_BLINKIN_CHANNEL,
        pulsewidth: BlinkinPattern.COLOR_WHITE
      }
    },
    {
      hub: 0,
      function: 'servo',
      parameters: {
        port: AUDIENCE_BLINKIN_CHANNEL,
        pulsewidth: BlinkinPattern.COLOR_WHITE
      }
    }
  ]
};

export const LED_COOPERTITION: FieldControlPacket = {
  messages: [
    {
      hub: 0,
      function: 'servo',
      parameters: {
        port: RED_BLINKIN_CHANNEL,
        pulsewidth: BlinkinPattern.COLOR_PURPLE
      }
    },
    {
      hub: 0,
      function: 'servo',
      parameters: {
        port: BLUE_BLINKIN_CHANNEL,
        pulsewidth: BlinkinPattern.COLOR_PURPLE
      }
    },
    {
      hub: 0,
      function: 'servo',
      parameters: {
        port: AUDIENCE_BLINKIN_CHANNEL,
        pulsewidth: BlinkinPattern.COLOR_PURPLE
      }
    }
  ]
};
export const LED_COLOR1_HB_SLOW: FieldControlPacket = {
  messages: [
    {
      hub: 0,
      function: 'servo',
      parameters: {
        port: RED_BLINKIN_CHANNEL,
        pulsewidth: BlinkinPattern.COLOR_1_HB_SLOW
      }
    },
    {
      hub: 0,
      function: 'servo',
      parameters: {
        port: BLUE_BLINKIN_CHANNEL,
        pulsewidth: BlinkinPattern.COLOR_1_HB_SLOW
      }
    },
    {
      hub: 0,
      function: 'servo',
      parameters: {
        port: AUDIENCE_BLINKIN_CHANNEL,
        pulsewidth: BlinkinPattern.COLOR_1_HB_SLOW
      }
    }
  ]
};
export const LED_COLOR2_HB_SLOW: FieldControlPacket = {
  messages: [
    {
      hub: 0,
      function: 'servo',
      parameters: {
        port: RED_BLINKIN_CHANNEL,
        pulsewidth: BlinkinPattern.COLOR_2_HB_SLOW
      }
    },
    {
      hub: 0,
      function: 'servo',
      parameters: {
        port: BLUE_BLINKIN_CHANNEL,
        pulsewidth: BlinkinPattern.COLOR_2_HB_SLOW
      }
    },
    {
      hub: 0,
      function: 'servo',
      parameters: {
        port: AUDIENCE_BLINKIN_CHANNEL,
        pulsewidth: BlinkinPattern.COLOR_2_HB_SLOW
      }
    }
  ]
};
export const LED_COLOR1_HB_MED: FieldControlPacket = {
  messages: [
    {
      hub: 0,
      function: 'servo',
      parameters: {
        port: RED_BLINKIN_CHANNEL,
        pulsewidth: BlinkinPattern.COLOR_1_HB_MED
      }
    },
    {
      hub: 0,
      function: 'servo',
      parameters: {
        port: BLUE_BLINKIN_CHANNEL,
        pulsewidth: BlinkinPattern.COLOR_1_HB_MED
      }
    },
    {
      hub: 0,
      function: 'servo',
      parameters: {
        port: AUDIENCE_BLINKIN_CHANNEL,
        pulsewidth: BlinkinPattern.COLOR_1_HB_MED
      }
    }
  ]
};
export const LED_COLOR2_HB_MED: FieldControlPacket = {
  messages: [
    {
      hub: 0,
      function: 'servo',
      parameters: {
        port: RED_BLINKIN_CHANNEL,
        pulsewidth: BlinkinPattern.COLOR_2_HB_MED
      }
    },
    {
      hub: 0,
      function: 'servo',
      parameters: {
        port: BLUE_BLINKIN_CHANNEL,
        pulsewidth: BlinkinPattern.COLOR_2_HB_MED
      }
    },
    {
      hub: 0,
      function: 'servo',
      parameters: {
        port: AUDIENCE_BLINKIN_CHANNEL,
        pulsewidth: BlinkinPattern.COLOR_2_HB_MED
      }
    }
  ]
};
export const LED_COLOR1_HB_FAST: FieldControlPacket = {
  messages: [
    {
      hub: 0,
      function: 'servo',
      parameters: {
        port: RED_BLINKIN_CHANNEL,
        pulsewidth: BlinkinPattern.COLOR_1_HB_FAST
      }
    },
    {
      hub: 0,
      function: 'servo',
      parameters: {
        port: BLUE_BLINKIN_CHANNEL,
        pulsewidth: BlinkinPattern.COLOR_1_HB_FAST
      }
    },
    {
      hub: 0,
      function: 'servo',
      parameters: {
        port: AUDIENCE_BLINKIN_CHANNEL,
        pulsewidth: BlinkinPattern.COLOR_1_HB_FAST
      }
    }
  ]
};
export const LED_COLOR2_HB_FAST: FieldControlPacket = {
  messages: [
    {
      hub: 0,
      function: 'servo',
      parameters: {
        port: RED_BLINKIN_CHANNEL,
        pulsewidth: BlinkinPattern.COLOR_2_HB_FAST
      }
    },
    {
      hub: 0,
      function: 'servo',
      parameters: {
        port: BLUE_BLINKIN_CHANNEL,
        pulsewidth: BlinkinPattern.COLOR_2_HB_FAST
      }
    },
    {
      hub: 0,
      function: 'servo',
      parameters: {
        port: AUDIENCE_BLINKIN_CHANNEL,
        pulsewidth: BlinkinPattern.COLOR_2_HB_FAST
      }
    }
  ]
};
export const LED_EMPTY: FieldControlPacket = {
  messages: [
    {
      hub: 0,
      function: 'servo',
      parameters: {
        port: RED_BLINKIN_CHANNEL
      }
    },
    {
      hub: 0,
      function: 'servo',
      parameters: {
        port: BLUE_BLINKIN_CHANNEL
      }
    },
    {
      hub: 0,
      function: 'servo',
      parameters: {
        port: AUDIENCE_BLINKIN_CHANNEL
      }
    }
  ]
};

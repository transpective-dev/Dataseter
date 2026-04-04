const block_size = {
  a: 20,
  b: 10,
};

const window_size = {
  height: block_size.a + block_size.b,
  width: 108,
};


const borderStyle = {
  borderStyle: "single",
  borderColor: "white",
} as const

export const module_config = {
  borderStyle,
  window_size,
  block_size,
  a_item: {
    r: {
      width: window_size.width * 0.7,
      height: block_size.a,
    },
    l: {
      width: window_size.width * 0.3,
      height: block_size.a,
      ...borderStyle
    },
  },
  b_item: {
    r: {
      width: window_size.width * 0.7,
      height: block_size.b,
      ...borderStyle
    },
    l: {
      width: window_size.width * 0.3,
      height: block_size.b,
      ...borderStyle
    },
  },
};

export const convert = (obj: any) => {

}

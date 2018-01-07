let readAsDataUrl = file => {
  let r = new FileReader();

  return new Promise((res, rej) => {
    r.addEventListener('error', err => {
      rej(err);
    });

    r.addEventListener('load', () => {
      res(r.result);
    }, false);

    r.readAsDataURL(file);
  });
};

let blobUrlFromDataUrl = dataUrl => {
  if (!dataUrl) {
    return null;
  }

  let arr = dataUrl.split(',');
  let mime = arr[0].match(/:(.*?);/)[1];
  let bstr = atob(arr[1]);
  let n = bstr.length;
  let u8arr = new Uint8Array(n);

  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }

  return URL.createObjectURL(
    new Blob([u8arr], { type: mime })
  );
};

let selectFile = cb => {
  let input = document.createElement('input');

  input.type = 'file';
  input.style.display = 'none';

  input.addEventListener('change', ev => {
    let file = input.files[0];

    readAsDataUrl(file)
      .then(dataUrl => {
        cb({
          blobUrl: URL.createObjectURL(file),
          dataUrl,
        });
      })
      .catch(err => {
        console.error(err);
      });
  });

  document.body.appendChild(input);
  input.click();
};

let layerConfBg = {
  oninit: function({ attrs }) {
    this.attrs = attrs;

    this.selectBg = () => {
      selectFile(({ blobUrl, dataUrl }) => {
        Object.assign(this.attrs.conf, {
          bgBlobUrl: blobUrl,
          bgDataUrl: dataUrl,
        });

        gs.save();
        m.redraw();
      });
    };

    this.clearBg = () => {
      Object.assign(this.attrs.conf, {
        bgBlobUrl: null,
        bgDataUrl: null,
      });

      gs.save();
      m.redraw();
    };
  },

  onupdate: function({ attrs }) {
    this.attrs = attrs;
  },

  view: function({ attrs }) {
    return m('.layerConf-bg', [
      m('button.layerConf-bgSelectBtn', {
        onclick: this.selectBg,
      }, [
        !attrs.conf.bgBlobUrl ? 'Select' : 'Change',
      ]),

      m('button.layerConf-bgClearBtn', {
        onclick: this.clearBg,
      }, [
        'Clear',
      ]),
    ]);
  },
};

let confField = {
  oninit: function({ attrs }) {
    this.attrs = attrs;

    this.onChangeCb = name => ev => {
      let val = ev.target.value;

      if (attrs.type === 'number') {
        val = Number(val);
      }

      this.attrs.conf[name] = val;
      gs.save();
    };
  },

  onupdate: function({ attrs }) {
    this.attrs = attrs;
  },

  view: function({ attrs }) {
    return m('.confField', [
      m('.confField-label', attrs.label),

      m('input.confField-input', {
        onkeyup: this.onChangeCb(attrs.name),
        onchange: this.onChangeCb(attrs.name),
        type: attrs.type || 'text',
        value: attrs.conf[attrs.name].toString() || '',
      }),
    ]);
  },
};

let layerConf = {
  oninit: function({ attrs }) {
    this.onChangeCb = k => ev => {
      attrs[k] = ev.target.value;

      gs.save();
      m.redraw();
    };
  },

  view: function({ attrs }) {
    return m('.layerConf', [
      m('input.layerConf-name', {
        onchange: this.onChangeCb('name'),
        value: attrs.name,
      }),

      m(layerConfBg, { conf: attrs }),

      m(confField, {
        conf: attrs,
        type: 'number',
        name: 'hSpd',
        label: 'H. Spd.:',
      }),

      m(confField, {
        conf: attrs,
        type: 'number',
        name: 'vSpd',
        label: 'V. Spd.:',
      }),
    ]);
  },
};

let layerConfs = {
  view: function() {
    return m('.layerConfs', [
      gs.current.layers.map(x => m(layerConf, x)),
    ]);
  },
};

let parallaxConf = {
  oninit: function() {
    this.selectParallax = ev => {
      gs.current = gs.setups[ev.target.value];
      gs.save();

      m.redraw();
    };

    this.new = () => gs.newSetup();

    this.del = () => {
      if (Object.keys(gs.setups).length <= 1) {
        return;
      }

      let i = Object.values(gs.setups).findIndex(
        x => x === gs.current
      );

      delete gs.setups[gs.current.name];

      gs.current = Object.values(gs.setups)[
        Math.max(0, i - 1)
      ];

      gs.save();
    };
  },

  view: function() {
    return m('.parallaxConf', [
      m('.parallaxConf-general', [
        m('select.parallaxConf-select', {
          onchange: this.selectParallax,
        }, [
          Object.values(gs.setups)
            .map(x => m('option', {
              selected: gs.current.name === x.name,
            }, [
              x.name,
            ]))
        ]),

        m('button.parallaxConf-newBtn', {
          onclick: this.new,
        }, [
          'New',
        ]),

        m('button.parallaxConf-delBtn', {
          onclick: this.del,
        }, [
          'Delete',
        ]),

        /*
        m('button.parallaxConf-renameBtn', {
          onclick: this.rename,
        }, [
          'Rename',
        ]),
        */

        m(confField, {
          conf: gs.current.viewport,
          type: 'number',
          name: 'width',
          label: 'V. W.:',
        }),

        m(confField, {
          conf: gs.current.viewport,
          type: 'number',
          name: 'height',
          label: 'V. H.:',
        }),
      ]),

      m(layerConfs),
    ]);
  },
};

let viewportBg = {
  oninit: function({ attrs }) {
    this.layer = attrs;
    this.x = this.y = 0;

    this.attachStateToDom = () => {
      this.dom.querySelector('.viewport-bg')
        .parallaxState = this;
    };
  },

  oncreate: function({ dom }) {
    this.dom = dom;
    this.attachStateToDom();
  },

  onupdate: function({ attrs, dom }) {
    this.layer = attrs;
    this.dom = dom;

    this.attachStateToDom();
  },

  view: function({ attrs }) {
    return m('.viewport-bgWrapper', {
      style: attrs.bgBlobUrl ?
        `--bgBlobUrl: url(${attrs.bgBlobUrl});` : '',
    }, [
      m('.viewport-bg'),
    ]);
  },
};

let viewport = {
  view: function() {
    return m('.viewport', {
      style: `
        width: ${gs.current.viewport.width}px;
        height: ${gs.current.viewport.height}px;
      `,
    }, [
      gs.current.layers.map(
        x => m(viewportBg, x)
      ),
    ]);
  },
};

let parallaxTest = {
  oninit: function() {
    window.gs = this;

    this.setups = {};

    try {
      Object.assign(this, JSON.parse(
        localStorage.getItem('parallaxTest')
      ) || {});

      let setups = Object.values(this.setups);

      for (let setup of setups) {
        for (let layer of setup.layers) {
          layer.bgBlobUrl =
            blobUrlFromDataUrl(layer.bgDataUrl);
        }
      }
    }
    catch(err) {
      console.error(err);
    }

    this.save = () => {
      localStorage.setItem(
        'parallaxTest', JSON.stringify(this)
      );
    };

    this.newSetup = () => {
      let i = 0;

      while (this.setups[`Parallax ${++i}`]) {
      }

      let setup = {
        name: `Parallax ${i}`,

        viewport: {
          width: 256,
          height: 240,
        },

        layers: ['BG 1', 'BG 2', 'BG 3', 'BG 4']
          .map(name => ({
            name,
            bgBlobUrl: null,
            bgDataUrl: null,
            hSpd: 0,
            vSpd: 0,
          })),
      };

      this.current = this.setups[setup.name] = setup;
      this.save();

      m.redraw();
    };

    this.current = Object.values(this.setups)[0];

    if (!this.current) {
      this.newSetup();
    }
  },

  view: function() {
    return m('.parallaxTest', [
      m(parallaxConf),
      m(viewport),
    ]);
  },
};

requestAnimationFrame(function fn() {
  requestAnimationFrame(fn);

  let bgEls = document.querySelectorAll('.viewport-bg');

  for (let bgEl of bgEls) {
    let st = bgEl.parallaxState;

    st.x += st.layer.hSpd;
    st.y += st.layer.vSpd;

    bgEl.style.backgroundPositionX =
      `${Math.floor(st.x)}px`;

    bgEl.style.backgroundPositionY =
      `${Math.floor(st.y)}px`;
  }
});

document.addEventListener('DOMContentLoaded', () => {
  m.mount(document.body, parallaxTest);
});

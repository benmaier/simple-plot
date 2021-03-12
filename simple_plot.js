class simplePlot {
  constructor(context, width, height, user_config={}) {

    let config = {
      margin: 20,
      fontsize: 12,
      xScaleType: 'lin',
      yScaleType: 'lin',
      fastScatter: false
    }

    Reflect.ownKeys(user_config).forEach(function(key){
      config[key] = user_config[key];
    });

    this.ctx = context;
    this.w = width;
    this.h = height;
    this.margin = config.margin;
    this.data = {};
    this.scatterData = {};
    this.range_x = null;
    this.range_y = null;
    this.title = null;
    this.x_label = null;
    this.y_label = null;
    this.draw_legend = false;
    this.xlim_labels = null;
    this.ylim_labels = null;
    this.fsize = config.fontsize;
    this.xScaleType = config.xScaleType;
    this.yScaleType = config.yScaleType;
    this.fastScatter = config.fastScatter;

    this.frame_left = true;
    this.frame_bottom = true;
    this.frame_right = true;
    this.frame_top = true;

    if (this.xScaleType == 'log')
      this.xScale = d3.scaleLog().range([this.margin, this.w - this.margin]);
    else
      this.xScale = d3.scaleLinear().range([this.margin, this.w - this.margin]);

    if (this.yScaleType == 'log')
      this.yScale = d3.scaleLog().range([this.h - this.margin, this.margin]);
    else
      this.yScale = d3.scaleLinear().range([this.h - this.margin, this.margin]);

    let self = this;
    this.ctx.canvas.onmousemove = function(e) { self.mousemove(self,e); };
    this.ctx.canvas.onmouseout = function(e) { self.highlight_out_global(self); };

    this.highlight = {
        X: {
          canv : null,
          data : null,
          show : false
        },
        Y: {
          canv : null,
          data : null,
          show : false
        }
    };

    this.cousin_plots = [];

    this.show_xticks = true;
    this.show_yticks = true;
  }

  add_cousin(other)
  {
    this.cousin_plots.push(other);
    other.cousin_plots.push(this);
  }

  mousemove(self,e)
  {
    self.highlight.X.canv = e.offsetX;
    self.highlight.Y.canv = e.offsetY;
    self.highlight.X.data = self.xScale.invert(e.offsetX);
    self.highlight.Y.data = self.yScale.invert(e.offsetY);

    self.draw();
    self.cousin_plots.forEach(other => other.set_highlight_from_data(
                                            other,
                                            self.highlight.X.data,
                                            self.highlight.Y.data
                                         )
                             );
  }

  set_highlight_from_data(self,x,y)
  {
    self.highlight.X.data = x;
    self.highlight.Y.data = y;
    self.highlight.X.canv = self.xScale(x);
    self.highlight.Y.canv = self.yScale(y);
    self.draw();
  }

  highlight_out(self)
  {
    self.highlight.X.data = null;
    self.highlight.Y.data = null;
    self.highlight.X.canv = null;
    self.highlight.Y.canv = null;
    self.draw();
  }

  highlight_out_global(self)
  {
    self.highlight_out(self);
    self.cousin_plots.forEach(other => other.highlight_out(other));
  }

  set_highlight(axes="XY")
  {

    let self = this;
    let letters = axes.split("");

    if (letters.includes("X") || letters.includes("x"))
      self.highlight.X.show = true;
    else
      self.highlight.X.show = false;

    if (letters.includes("Y") || letters.includes("y"))
      self.highlight.Y.show = true;
    else
      self.highlight.Y.show = false;
  }

  scatter(label, x, y, user_config={})
  {
    let config = {
      marker: 'o', 
      markercolor: '#000', 
      markerradius: 1, 
      markeredgewidth: 0, 
      markeredgecolor: 'rgba(0,0,0,0)'
    }

    Reflect.ownKeys(user_config).forEach(function(key){
      config[key] = user_config[key];
    });

    if (!this.scatterData.hasOwnProperty(label)) {
      this.scatterData[label] = {};
      this.scatterData[label].marker = config.marker;
      this.scatterData[label].markercolor = config.markercolor;
      this.scatterData[label].markerradius = config.markerradius;
      this.scatterData[label].markeredgewidth = config.markeredgewidth;
      this.scatterData[label].markeredgecolor = config.markeredgecolor;
    }

    this.scatterData[label].x = x;
    this.scatterData[label].y = y;

    if (!(this.range_x === null)) {
      let xmax = d3.max([this.range_x[1], d3.max(x)]);
      let xmin = d3.min([this.range_x[0], d3.min(x)]);
      if (xmax != this.range_x[1] || xmin != this.range_x[0])
        this.xlim([xmin, xmax]);
    }
    else {
      this.xlim([d3.min(x), d3.max(x)]);
    }

    if (!(this.range_y === null)) {
      let ymax = d3.max([this.range_y[1], d3.max(y)]);
      let ymin = d3.min([this.range_y[0], d3.min(y)]);
      if (ymax != this.range_y[1] || ymin != this.range_y[0])
        this.ylim([ymin, ymax]);
    }
    else {
      this.ylim([d3.min(y), d3.max(y)]);
    }

    this.draw();
  }

  step(label, x, y, user_config={})
  {
    user_config.is_step = true;
    this.plot(label, x, y, user_config);
  }

  plot(label, x, y, user_config={})
  {
    let config = {
      linedash: [], 
      linecolor: '#000', 
      linewidth: 1, 
      is_step: false
    }

    Reflect.ownKeys(user_config).forEach(function(key){
      config[key] = user_config[key];
    });

    if (!this.data.hasOwnProperty(label)) {
      this.data[label] = {};
      this.data[label].linedash = config.linedash;
      this.data[label].linecolor = config.linecolor;
      this.data[label].linewidth = config.linewidth;
      this.data[label].is_step = config.is_step;
    }
    this.data[label].x = x;
    this.data[label].y = y;

    if (!(this.range_x === null)) {
      let xmax = d3.max([this.range_x[1], d3.max(x)]);
      let xmin = d3.min([this.range_x[0], d3.min(x)]);
      if (xmax != this.range_x[1] || xmin != this.range_x[0])
        this.xlim([xmin, xmax]);
    }
    else {
      this.xlim([d3.min(x), d3.max(x)]);
    }

    if (!(this.range_y === null)) {
      let ymax = d3.max([this.range_y[1], d3.max(y)]);
      let ymin = d3.min([this.range_y[0], d3.min(y)]);
      if (ymax != this.range_y[1] || ymin != this.range_y[0])
        this.ylim([ymin, ymax]);
    }
    else {
      this.ylim([d3.min(y), d3.max(y)]);
    }

    this.draw();
  }

  changePlotAttr(label, linedash = null, linecolor = null, linewidth = null, is_step = null) {
    if (linedash !== null)
      this.data[label].linedash = linedash;
    if (linecolor !== null)
      this.data[label].linecolor = linecolor;
    if (linewidth !== null)
      this.data[label].linewidth = linewidth;
    if (is_step !== null)
      this.data[label].is_step = is_step;

    this.draw();
  }

  xlim(rX) {
    if (!arguments.length) return this.range_x;

    this.range_x = rX;
    this.xScale.domain(rX);
    this.draw();
  }

  ylim(rY) {
    if (!arguments.length) return this.range_y;

    this.range_y = rY;
    this.yScale.domain(rY);
    this.draw();
  }

  xlabel(xl) {
    if (!arguments.length) return this.x_label;
    this.x_label = xl;
    this.draw();
  }

  ylabel(yl) {
    if (!arguments.length) return this.y_label;
    this.y_label = yl;
    this.draw();
  }

  xscale(scaletype) {
    if (!arguments.length) return this.xScaleType;
    this.xScaleType = scaletype;

    if (this.xScaleType == 'log')
      this.xScale = d3.scaleLog().range([this.margin, this.w - this.margin]);
    else
      this.xScale = d3.scaleLinear().range([this.margin, this.w - this.margin]);

    if (!(this.range_x === null))
      this.xScale.domain(this.range_x);
    this.draw();
  }

  yscale(scaletype) {
    if (!arguments.length) return this.yScaleType;
    this.yScaleType = scaletype;

    if (this.yScaleType == 'log')
      this.yScale = d3.scaleLog().range([this.h - this.margin, this.margin]);
    else
      this.yScale = d3.scaleLinear().range([this.h - this.margin, this.margin]);

    if (!(this.range_y === null))
      this.yScale.domain(this.range_y);
    this.draw();
  }

  xlimlabels(xl) {
    if (!arguments.length) return this.xlim_labels;
    this.xlim_labels = xl;
    this.draw();
  }

  ylimlabels(yl) {
    if (!arguments.length) return this.ylim_labels;
    this.ylim_labels = yl;
    this.draw();
  }

  xticklabels(on=true)
  {
    this.show_xticks = on;
    this.draw();
  }

  yticklabels(on=true)
  {
    this.show_yticks = on;
    this.draw();
  }

  legend(on = true) {
    this.draw_legend = on;
    this.draw();
  }

  frame(frame_pos="left bottom right top") {
    let words = frame_pos.split(" ");
    if (words.includes("left")) {
      this.frame_left = true;
    } else {
      this.frame_left = false;
    }
    if (words.includes("bottom")) {
      this.frame_bottom = true;
    } else {
      this.frame_bottom = false;
    }
    if (words.includes("right")) {
      this.frame_right = true;
    } else {
      this.frame_right = false;
    }
    if (words.includes("top")) {
      this.frame_top = true;
    } else {
      this.frame_top = false;
    }

    this.draw();
  }

  resize(width, height)
  {
    this.w = width;
    this.h = height;
    this.xScale.range([this.margin, this.w - this.margin]);
    this.yScale.range([this.h - this.margin, this.margin]);

    this.draw();
  }

  draw() {
    let ctx = this.ctx;
    let xS = this.xScale;
    let yS = this.yScale;
    let mrgn = this.margin;
    let w = this.w;
    let h = this.h;

    ctx.clearRect(0, 0, this.w, this.h);
    ctx.save()
    ctx.lineWidth = 0;
    ctx.strokeStyle = '#fff';
    ctx.rect(mrgn, mrgn, this.w - 2 * mrgn, this.h - 2 * mrgn);
    ctx.stroke();
    ctx.clip();

    // =========== DRAW CURVES ===============

    for (var label in this.data) {
      if (this.data.hasOwnProperty(label)) {
        let x = this.data[label].x;
        let y = this.data[label].y;
        let lw = this.data[label].linewidth;
        let ld = this.data[label].linedash;
        let lc = this.data[label].linecolor;


        ctx.lineWidth = lw;
        ctx.setLineDash(ld);
        ctx.strokeStyle = lc;

        ctx.beginPath();
        if (!this.data[label].is_step) {
          ctx.moveTo(xS(x[0]), yS(y[0]));
          for (var i = 1; i < x.length; ++i)
            ctx.lineTo(xS(x[i]), yS(y[i]));
        }
        else {
          ctx.moveTo(xS(x[0]), yS(y[0]));
          for (var i = 1; i < x.length - 1; ++i) {
            ctx.lineTo(0.5 * (xS(x[i - 1]) + xS(x[i])), yS(y[i - 1]));
            ctx.lineTo(0.5 * (xS(x[i - 1]) + xS(x[i])), yS(y[i]));
            ctx.lineTo(xS(x[i]), yS(y[i]));
          }
        }
        ctx.stroke();
      }
    }



    ctx.setLineDash([]);
    // =========== DRAW SCATTER =============

    for (var label in this.scatterData) {
      if (this.scatterData.hasOwnProperty(label)) {
        let x = this.scatterData[label].x;
        let y = this.scatterData[label].y;
        let m = this.scatterData[label].marker;
        let mr = this.scatterData[label].markerradius;
        let md = 2 * mr;
        let mc = this.scatterData[label].markercolor;
        let mew = this.scatterData[label].markeredgewidth;
        let mec = this.scatterData[label].markeredgecolor;


        ctx.lineWidth = mew;
        ctx.strokeStyle = mec;
        ctx.fillStyle = mc;

        for (var i = 0; i < x.length; ++i) {
          let _x = xS(x[i]);
          let _y = yS(y[i]);

          if (m == 's') {
            ctx.fillRect(_x - mr, _y - mr, md, md);
            ctx.beginPath();
            ctx.rect(_x - mr, _y - mr, md, md);
            if (!this.fastScatter)
              ctx.stroke();
          }
          else //if (m == 'o')
          {
            ctx.beginPath();
            ctx.moveTo(_x + mr, _y);
            ctx.arc(_x, _y, mr, 0, 2 * Math.PI);
            if (!this.fastScatter)
            {
              ctx.fill();
              ctx.stroke();
            }
          }
        }
        if (this.fastScatter)
        {
          ctx.fill();
          ctx.stroke();
        }
      }
    }

    ctx.restore()


    // ========== DRAW FRAME AND LABELS =========
    ctx.strokeStyle = '#000';
    ctx.setLineDash([]);
    ctx.lineWidth = 1;
    ctx.beginPath();
    if (this.frame_left && this.frame_bottom && this.frame_right && this.frame_top)
    {
      ctx.rect(mrgn, mrgn, this.w - 2 * mrgn, this.h - 2 * mrgn);
    }
    else{
      ctx.moveTo(mrgn, mrgn);
      if (this.frame_left) 
        ctx.lineTo(mrgn, this.h-mrgn);
      else
      {
        ctx.stroke()
        ctx.moveTo(mrgn, this.h-mrgn);
      }

      if (this.frame_bottom) 
        ctx.lineTo(this.w - mrgn, this.h-mrgn);
      else
      {
        ctx.stroke()
        ctx.moveTo(this.w - mrgn, this.h-mrgn);
      }

      if (this.frame_right) 
        ctx.lineTo(this.w - mrgn, mrgn);
      else
      {
        ctx.stroke()
        ctx.moveTo(this.w - mrgn, mrgn);
      }

      if (this.frame_top) 
        ctx.lineTo(mrgn, mrgn);
    }
    ctx.stroke();

    let fsize = this.fsize;
    ctx.textAlign = 'center';
    ctx.fillStyle = '#000';
    ctx.font = fsize.toString() + 'px Arial, Helvetica Neue, sans-serif';

    let fH = ctx.measureText("W").width * 1;


    if (this.x_label !== null) {
      ctx.fillText(this.x_label, w / 2, h - fH / 3);
    }

    if (this.y_label !== null) {
      ctx.save();
      ctx.translate(1.2 * mrgn - fH, h / 2);
      ctx.rotate(-Math.PI / 2);
      ctx.fillText(this.y_label, 0, 0);
      ctx.restore();
    }

    if (this.range_x !== null && this.show_xticks) {
      let xmin,
        xmax;
      if ((this.xlim_labels) === null) {
        xmin = this.stripZeros(d3.format('s')(this.range_x[0]));
        xmax = this.stripZeros(d3.format('s')(this.range_x[1]));
      }
      else {
        xmin = this.xlim_labels[0];
        xmax = this.xlim_labels[1];
      }

      let fsize = this.fsize / 13 * 10;
      ctx.font = fsize.toString() + 'px Arial, Helvetica Neue, sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(xmin, mrgn, (h - mrgn) + fsize);
      ctx.textAlign = 'right';
      ctx.fillText(xmax, w - mrgn, (h - mrgn) + fsize);
    }

    if (this.range_y !== null && this.show_yticks) {
      let ymin,
        ymax;
      if ((this.ylim_labels) === null) {
        ymin = this.stripZeros(d3.format('s')(this.range_y[0]));
        ymax = this.stripZeros(d3.format('s')(this.range_y[1]));
      }
      else {
        ymin = this.ylim_labels[0];
        ymax = this.ylim_labels[1];
      }
      let fsize = this.fsize / 13 * 10;
      ctx.font = fsize.toString() + 'px Arial, Helvetica Neue, sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText(ymin, mrgn - 0.3 * fsize, (h - mrgn));
      ctx.textAlign = 'right';
      ctx.fillText(ymax, mrgn - 0.3 * fsize, mrgn + fsize);
    }

    if (this.highlight.X.show && this.highlight.X.data !== null &&
        this.highlight.X.canv > mrgn && this.highlight.X.canv < w - mrgn)
    {

      ctx.save();
      ctx.lineWidth = 1;
      ctx.setLineDash([]);
      ctx.strokeStyle = '#888';
      ctx.beginPath();
      ctx.moveTo(this.highlight.X.canv,mrgn);
      ctx.lineTo(this.highlight.X.canv,h-mrgn);
      ctx.stroke();
      ctx.strokeStyle = '#000';

      if (this.highlight.X.canv < w/2)
        ctx.textAlign = 'left';
      else
        ctx.textAlign = 'right';
      ctx.font = fsize.toString() + 'px Arial, Helvetica Neue, sans-serif';
      ctx.fillText(
                    this.stripZeros(d3.format('s')(this.highlight.X.data)),
                    this.highlight.X.canv,
                    mrgn - 0.2*fH
                  );

      ctx.restore();

    }
    if (this.highlight.Y.show && this.highlight.Y.data !== null &&
        this.highlight.Y.canv > mrgn && this.highlight.Y.canv < h - mrgn
       ) {

      ctx.save();
      ctx.lineWidth = 1;
      ctx.setLineDash([]);
      ctx.strokeStyle = '#888';
      ctx.beginPath();
      ctx.moveTo(mrgn,this.highlight.Y.canv);
      ctx.lineTo(w-mrgn,this.highlight.Y.canv);
      ctx.stroke();
      ctx.strokeStyle = '#000';

      if (this.highlight.Y.canv < h/2)
        ctx.textAlign = 'right';
      else
        ctx.textAlign = 'left';
      ctx.font = fsize.toString() + 'px Arial, Helvetica Neue, sans-serif';
      ctx.translate(w - mrgn + fH, this.highlight.Y.canv);
      ctx.rotate(-Math.PI / 2);
      ctx.fillText(
                    this.stripZeros(d3.format('s')(this.highlight.Y.data)),
                    0,0
                  );

      ctx.restore();


    }

    if (this.draw_legend) {
      let l_offset_x = mrgn + 5;
      let N_curves = Reflect.ownKeys(this.data).length + Reflect.ownKeys(this.scatterData).length;
      let l_h = N_curves * (fH * 1.1);
      let l_offset_y = h - mrgn - l_h;
      let i = 0;
      ctx.textAlign = 'left';
      for (var label in this.data) {

        let lw = this.data[label].linewidth;
        let ld = this.data[label].linedash;
        let lc = this.data[label].linecolor;
        ctx.lineWidth = lw;
        ctx.setLineDash(ld);
        ctx.strokeStyle = lc;
        ctx.beginPath();
        ctx.moveTo(l_offset_x, l_offset_y + fH / 2 + i * fH * 1.1);
        ctx.lineTo(l_offset_x + 20, l_offset_y + fH / 2 + i * fH * 1.1);
        ctx.stroke();

        ctx.strokeStyle = '#000';
        ctx.fillStyle = '#000';
        ctx.setLineDash([]);
        ctx.lineWidth = 1;
        ctx.fillText(label, l_offset_x + 25, l_offset_y + (i + 1) * fH * 1.1 - fH / 3);
        ++i;
      }
      for (var label in this.scatterData) {

        let m = this.scatterData[label].marker;
        let mr = this.scatterData[label].markerradius;
        let md = 2 * mr;
        let mc = this.scatterData[label].markercolor;
        let mew = this.scatterData[label].markeredgewidth;
        let mec = this.scatterData[label].markeredgecolor;


        ctx.lineWidth = mew;
        ctx.strokeStyle = mec;
        ctx.fillStyle = mc;

          let _x = l_offset_x+10;
          let _y = l_offset_y + fH / 2 + i * fH * 1.1;

          if (m == 's') {
            ctx.fillRect(_x - mr, _y - mr, md, md);
            ctx.beginPath();
            ctx.rect(_x - mr, _y - mr, md, md);
            ctx.stroke();
          }
          else //if (m == 'o')
          {
            ctx.beginPath();
            ctx.moveTo(_x + mr, _y);
            ctx.arc(_x, _y, mr, 0, 2 * Math.PI);
            ctx.fill();
            ctx.stroke();
          }

        ctx.strokeStyle = '#000';
        ctx.fillStyle = '#000';
        ctx.setLineDash([]);
        ctx.lineWidth = 1;
        ctx.fillText(label, l_offset_x + 25, l_offset_y + (i + 1) * fH * 1.1 - fH / 3);
        ++i;
      }
    }
  }

  stripZeros(s) {
    while (s[s.length - 1] == '0') {
      s = s.slice(0, s.length - 1);
    }
    if (s[s.length - 1] == '.')
      s = s.slice(0, s.length - 1);
    return s;
  }
}

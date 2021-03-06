class simplePlot {
  constructor(context, width, height, user_config={}) {

    let config = {
      margin: 20,
      fontsize: 12,
      xScaleType: 'lin',
      yScaleType: 'lin',
      fastScatter: false,
      format_string: '.3s',
      allow_zoom_x: true,
      allow_zoom_y: true,
      show_zoom_helpers:true
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
    this.format_string = config.format_string;
    this.format = d3.format(config.format_string);

    this.frame_left = true;
    this.frame_bottom = true;
    this.frame_right = true;
    this.frame_top = true;

    this.allow_zoom_x = config.allow_zoom_x;
    this.allow_zoom_y = config.allow_zoom_y;
    this.show_zoom_helpers = config.show_zoom_helpers;
    this.number_of_outzooms = 0;

    this.range_stack_x = [this.range_x];
    this.range_stack_y = [this.range_y];
    this.range_stack_i = 0;

    this.legend_bg_color = 'rgba(255,255,255,1)';
    this.legend_dx = 0;
    this.legend_dy = 2;

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
    this.ctx.canvas.onmousedown = function(e) { self.mousedown(self,e); };
    this.ctx.canvas.onmouseup = function(e) { self.mouseup(self,e); };
    this.ctx.canvas.ondblclick = function(e) { self.double_click(self,e); };

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

    this.is_dragging = false;

    this.cursordown = { 
                       X: 
                         {
                            canv: null,
                            data: null
                         },
                       Y: 
                         {
                            canv: null,
                            data: null
                         }
                    }

    this.cursorup = JSON.parse(JSON.stringify(this.cursordown));

    this.cousin_plots = [];

    this.show_xticks = true;
    this.show_yticks = true;
  }

  add_cousin(other)
  {
    this.cousin_plots.push(other);
    other.cousin_plots.push(this);
  }

  // Internally used function to provide interactivity
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

  // Internally used function to provide interactivity
  set_highlight_from_data(self,x,y)
  {
    self.highlight.X.data = x;
    self.highlight.Y.data = y;
    self.highlight.X.canv = self.xScale(x);
    self.highlight.Y.canv = self.yScale(y);
    self.draw();
  }

  // Internally used function to provide interactivity
  highlight_out(self)
  {
    self.highlight.X.data = null;
    self.highlight.Y.data = null;
    self.highlight.X.canv = null;
    self.highlight.Y.canv = null;
    self.is_dragging = false;
    self.draw();
  }

  // Internally used function to provide interactivity
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

  mousedown(self,e)
  {
    let mrgn = this.margin;
    let w = this.w;
    let h = this.h;

    if (e.offsetX > mrgn && e.offsetX < w - mrgn && e.offsetY < h - mrgn && e.offsetY > mrgn)
    {
      self.is_dragging = true;
      self.cursordown.X.canv = e.offsetX;
      self.cursordown.Y.canv = e.offsetY;
      self.cursordown.X.data = self.xScale.invert(e.offsetX);
      self.cursordown.Y.data = self.yScale.invert(e.offsetY);
    }

  }

  mouseup(self,e)
  {
    let mrgn = this.margin;
    let w = this.w;
    let h = this.h;

    if (self.is_dragging)
    {
      self.is_dragging = false;

      self.cursorup.X.canv = e.offsetX;
      self.cursorup.Y.canv = e.offsetY;
      self.cursorup.X.data = self.xScale.invert(e.offsetX);
      self.cursorup.Y.data = self.yScale.invert(e.offsetY);
      self.manual_zoom(self);
    }
    //console.log("mouseup",e);
  }

  manual_zoom(self)
  {
    let y0, y1, x0, x1, ymin, ymax, xmin, xmax;
    if (self.allow_zoom_y)
    {
      y0 = self.cursordown.Y.data;
      y1 = self.cursorup.Y.data;
      ymin = d3.min([y0,y1]);
      ymax = d3.max([y0,y1]);
      ymin = d3.max([ymin,self.range_y[0]]);
      ymax = d3.min([ymax,self.range_y[1]]);
    }

    if (self.allow_zoom_x)
    {
      x0 = self.cursordown.X.data;
      x1 = self.cursorup.X.data;
      xmin = d3.min([x0,x1]);
      xmax = d3.max([x0,x1]);
      xmin = d3.max([xmin,self.range_x[0]]);
      xmax = d3.min([xmax,self.range_x[1]]);
    }

    let is_first_zoom = false;

    if ((ymin != ymax) || (xmin != xmax))
    {
        // check if the range stack is still in init mode and save the current view if yes
        is_first_zoom = self.try_saving_initial_range(self);
      /*
        if (self.allow_zoom_y)
          self.ylim([ymin,ymax]);
        if (self.allow_zoom_x)
          self.xlim([xmin,xmax]);
          */

        self.zoom_transition(self,xmin,xmax,ymin,ymax,function(){
          // if anything actually changed
          if ((self.allow_zoom_x && xmin != xmax) || (self.allow_zoom_y && ymin != ymax))
          {

            if (self.range_y !== null && self.range_stack_i < self.range_y.length-1)
            {
              self.range_stack_x = self.range_stack_x.slice(0,self.range_stack_i+1);
              self.range_stack_y = self.range_stack_y.slice(0,self.range_stack_i+1);
            }

            if (self.range_x !== null)
              self.range_stack_x.push(self.range_x.slice());
            else
              self.range_stack_x.push(null);

            if (self.range_y !== null)
              self.range_stack_y.push(self.range_y.slice());
            else
              self.range_stack_y.push(null);

            self.range_stack_i++;

            if (is_first_zoom && self.show_zoom_helpers)
            {
              self.blink(self,-1);
            }
            ++self.number_of_outzooms;
          }
        });

    }


  }

  zoom_transition(self,xmin,xmax,ymin,ymax,callback)
  {
      let duration = 200;
      let ease = d3.easeCubicInOut;
      let time = d3.scaleLinear().domain([0,duration]).range([0,1]);
      let _xmin = d3.scaleLinear().domain([0,1]).range([self.range_x[0],xmin]);
      let _xmax = d3.scaleLinear().domain([0,1]).range([self.range_x[1],xmax]);
      let _ymin = d3.scaleLinear().domain([0,1]).range([self.range_y[0],ymin]);
      let _ymax = d3.scaleLinear().domain([0,1]).range([self.range_y[1],ymax]);

      let t = d3.timer(function (elapsed) {
        if (elapsed > duration)
          elapsed = duration;
        let r = ease(time(elapsed));
        xmin = _xmin(r);
        ymin = _ymin(r);
        xmax = _xmax(r);
        ymax = _ymax(r);
        if (self.allow_zoom_y)
        {
          self.range_y = [ymin, ymax];
          self.yScale.domain(self.range_y);
        }
        if (self.allow_zoom_x)
        {
          self.range_x = [xmin, xmax];
          self.xScale.domain(self.range_x);
        }
        self.draw();
        if (elapsed == duration)
        {          
          t.stop();
          callback();
        }
      });
  }

  blink(self,direction)
  {
    let factor;
    if (direction == -1)
      factor = 1;
    else
      factor = 3;
    let rX = self.range_x;
    let rY = self.range_y;
    let w = self.w;
    let m = self.margin;
    let h = self.h;
    let x = factor * (rX[1] - rX[0]) / 4 + rX[0];
    let y = (rY[1] - rY[0]) / 2 + rY[0];
    let r = (h - 2*self.margin) / 10;

    let blink_count = 0;
    let t = d3.interval(function(elapsed) {
        if (blink_count > 2)
          t.stop();

        if (blink_count % 2 == 0)
        {
          self.scatter('__tap__',[x],[y],{
                  markercolor: 'rgba(0,0,0,0.2)',
                  markeredgewidth: 0,
                  markerradius : r,
                  show_in_legend : false
          });
        }
        else
        {
          delete self.scatterData['__tap__'];
        }
        self.draw();
        ++blink_count;
      }, 100);
  }

  try_saving_initial_range(self)
  {
    if (self.range_stack_i == 0 && self.range_stack_x.length == 1 && self.range_x !== null)
    {
      self.range_stack_x[0] = [ self.range_x[0], self.range_x[1] ];
      self.range_stack_y[0] = [ self.range_y[0], self.range_y[1] ];

      return true;
    }

    return false;
  }

  scatter(label, x, y, user_config={})
  {
    let config = {
      marker: 'o', 
      markercolor: '#000', 
      markerradius: 1, 
      markeredgewidth: 0, 
      markeredgecolor: 'rgba(0,0,0,0)',
      show_in_legend: true
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
      this.scatterData[label].show_in_legend = config.show_in_legend;
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
      is_step: false,
      show_in_legend: true
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
      this.data[label].show_in_legend = config.show_in_legend;
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

    if (this.range_x === null || rX[0] != this.range_x[0] || rX[1] != this.range_x[1])
    {
      this.range_x = rX;
      this.xScale.domain(rX);

      this.draw();
    }
  }

  ylim(rY) {
    if (!arguments.length) return this.range_y;

    if (this.range_y === null || rY[0] != this.range_y[0] || rY[1] != this.range_y[1])
    {
      this.range_y = rY;
      this.yScale.domain(rY);

      this.draw();
    }

  }

  double_click(self,e) {

    let w = self.w;
    let direction;

    if (e.offsetX < w/2)
    {
      direction = -1;
      if (self.range_stack_i == 0 || 
          self.range_stack_x[self.range_stack_i+direction] === null ||
          self.range_stack_y[self.range_stack_i+direction] === null
         )
        return;
    }
    else
    {
      direction = +1;
      if (self.range_stack_i == self.range_stack_x.length-1)
        return;
    }

    self.range_stack_i = self.range_stack_i + direction;  
    let rX = self.range_stack_x[self.range_stack_i];
    let rY = self.range_stack_y[self.range_stack_i];

    self.zoom_transition(self,rX[0],rX[1],rY[0],rY[1],function() {

        self.draw();
        if (direction == -1 && self.number_of_outzooms == 1)
          self.blink(self,+1);
        else
          ++self.number_of_outzooms;
    });


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

  legend(on=true,user_config={}) {

    let config = {
      position : 'lower left',
      background_color : 'rgba(255,255,255,0.2)'
    };

    Reflect.ownKeys(user_config).forEach(function(key){
      config[key] = user_config[key];
    });

    this.draw_legend = on;
    this.legend_bg_color = config.background_color;
    this.legend_dx = 0;
    this.legend_dy = 2;
    let words = config.position.split(" ");
    if (words.includes("left")) {
      this.legend_dx = 0;
    }
    if (words.includes("center")) {
      this.legend_dx = 1;
    }
    if (words.includes("right")) {
      this.legend_dx = 2;
    }
    if (words.includes("top")) {
      this.legend_dy = 0;
    }
    if (words.includes("middle")) {
      this.legend_dy = 1;
    }
    if (words.includes("bottom")) {
      this.legend_dy = 2;
    }
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

  draw()
  {
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
    //ctx.save()
    let this_dash = [];
    let segment_on = [this.frame_top,this.frame_right,this.frame_bottom,this.frame_left].map( on => on ? 1 : 0);
    let current_segment_length = 0;
    let last_segment_on = 1;
    let L = [w-2*mrgn,h-2*mrgn,w-2*mrgn,h-2*mrgn];
    for (let i=0; i<4; i++) {
      if (segment_on[i] != last_segment_on) {
        this_dash.push(current_segment_length)
        current_segment_length = 0;
      }
      current_segment_length += L[i]; 
      last_segment_on = segment_on[i];
    }
    if (current_segment_length > 0)
      this_dash.push(current_segment_length);
    if (this_dash[0] == 0)
      this_dash.push(0);
    if (this_dash.length > 1)
      ctx.setLineDash(this_dash);
    //ctx.restore();
    ctx.lineWidth = 1;
    ctx.strokeStyle = '#000';
    ctx.beginPath();
    ctx.rect(mrgn, mrgn, this.w - 2 * mrgn, this.h - 2 * mrgn);
    ctx.stroke();
    ctx.setLineDash([]);

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
        xmin = this.stripZeros(this.range_x[0]);
        xmax = this.stripZeros(this.range_x[1]);
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
        ymin = this.stripZeros(this.range_y[0]);
        ymax = this.stripZeros(this.range_y[1]);
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

    if ((this.highlight.X.show) && (this.highlight.X.data !== null) &&
        (this.highlight.X.canv > mrgn) && (this.highlight.X.canv < w - mrgn))
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
                    this.stripZeros(this.highlight.X.data),
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
                    this.stripZeros(this.highlight.Y.data),
                    0,0
                  );

      ctx.restore();


    }

    if (this.is_dragging) {
      let y0, y1, x0, x1, ymin, ymax, xmin, xmax;
      if (this.allow_zoom_y)
      {
        y0 = this.cursordown.Y.canv;
        y1 = this.highlight.Y.canv;
      }
      else
      {
        y0 = mrgn;
        y1 = h-mrgn;
      }
      ymin = d3.min([y0,y1]);
      ymax = d3.max([y0,y1]);
      ymin = d3.max([ymin,mrgn]);
      ymax = d3.min([ymax,h-mrgn]);
      if (this.allow_zoom_x)
      {
        x0 = this.cursordown.X.canv;
        x1 = this.highlight.X.canv;
      }
      else
      {
        x0 = mrgn;
        x1 = w-mrgn;
      }
      xmin = d3.min([x0,x1]);
      xmax = d3.max([x0,x1]);
      xmin = d3.max([xmin,mrgn]);
      xmax = d3.min([xmax,w-mrgn]);
      ctx.fillStyle = "rgba(0,0,0,0.1)";
      ctx.rect(xmin, ymin, xmax-xmin, ymax-ymin);
      ctx.fill();
    }

    if (this.draw_legend) {
      let l_offset_x = mrgn + 5;
      let N_curves = Reflect.ownKeys(this.data).filter(x=>this.data[x].show_in_legend).length + 
                     Reflect.ownKeys(this.scatterData).filter(x=>this.scatterData[x].show_in_legend).length;
      let l_h = N_curves * (fH * 1.1);
      let l_offset_y = h - mrgn - l_h;
      let i = 0;
      ctx.textAlign = 'left';

      for (var label in this.data)
      {

        if (this.data[label].show_in_legend)
        {
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
      }

      for (var label in this.scatterData)
      {
        if (this.scatterData[label].show_in_legend)
        {
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
  }

  stripZeros(s) {

    s = this.format(s);

    let last = "";

    if (!("0123456789".includes(s[s.length-1])))
    {
      last = s[s.length-1];
      s = s.slice(0, s.length - 1);
    }

    if (s.includes("."))
    {

      while (s[s.length - 1] == '0') {
        s = s.slice(0, s.length - 1);
      }

      if (s[s.length - 1] == '.')
        s = s.slice(0, s.length - 1);

    }

    s = s + last;

    return s;
  }
}

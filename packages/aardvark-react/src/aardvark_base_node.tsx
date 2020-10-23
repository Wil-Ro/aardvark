/** Base class and props that other Aardvark components derive from.
 * 
 * @packageDocumentation
 */
import { AvNode, AvNodeType, EndpointAddr, EndpointType, ENodeFlags } from '@aardvarkxr/aardvark-shared';
import * as React from 'react';
import { AvGadget } from './aardvark_gadget';


declare global 
{
	namespace JSX
	{
		interface IntrinsicElements
		{
			// add an element type
			"av-node": any;
		}
	}
}


/** Base props that are inherited by all Aardvark scene graph components. */
export interface AvBaseNodeProps
{
	/** This is the ID of the DOM element that is created as the parent of the component.
	 * It is used to reference other nodes in the gadget. If it is specified, it must 
	 * be unique within the gadget.
	 * 
	 * @default none
	 */
	id?: string;

	/** Controls whether or not this node and its children are visible. 
	 * If retaining the state of a node is important as it comes and goes,
	 * use the visible prop instead of omitting the node from the render function. 
	 * This allows the renderer to retain the node's state even when you don't want it
	 * to draw.
	 * 
	 * @default true
	 */
	visible?: boolean;

	/** An alias for debugName.
	 * 
	 * @deprecated
	 */
	persistentName?: string;

	/** A name that's applied to the node in the monitor and other tools. This name has no effect
	 * at runtime.
	 */
	debugName?: string;

	/** Set this prop to be notified when the node is assigned its endpoint address.
	 * This is not necessary for most nodes.
	 */
	onIdAssigned?: ( addr: EndpointAddr ) => void;

	/** @ignore */
	editable?: boolean;
}


/** Interface that all Aardvark components must implement so AvGadget can generate
 * the scene graph to render.
 */
export interface IAvBaseNode
{
	m_nodeId: number;
	buildNode(): AvNode;
	createNodeForNode(): AvNode;
	grabInProgress( grabber: EndpointAddr ): void;
}


/** Base class for all Aardvark components. */
export abstract class AvBaseNode<TProps, TState> extends React.Component<TProps, TState> 
	implements IAvBaseNode
{
	public m_nodeId: number;
	private m_firstUpdate = true;

	constructor( props: any )
	{
		super( props );

		AvGadget.instance().register( this );

		if( this.baseProps.onIdAssigned )
		{
			this.baseProps.onIdAssigned( this.endpointAddr() );
		}
	}

	/** @hidden */
	public abstract buildNode( ): AvNode;

	/** @hidden */
	public grabInProgress( grabber: EndpointAddr ):void
	{
		// nothing to do here, but some node types will need to do work
	}

	/** @hidden */
	public createNodeForNode(): AvNode
	{
		if( this.m_firstUpdate )
		{
			this.m_firstUpdate = false;

			if( this.baseProps && this.baseProps.onIdAssigned )
			{
				this.baseProps.onIdAssigned( this.endpointAddr() );
			}
	
		}

		return this.buildNode();
	}

	public get globalId(): EndpointAddr
	{
		return { type: EndpointType.Node, endpointId: AvGadget.instance().getEndpointId(), nodeId: this.m_nodeId };
	}

	/** @hidden */
	public componentWillUnmount()
	{
		AvGadget.instance().unregister( this );
		this.m_firstUpdate = true;
	}

	/** @hidden */
	protected createNodeObject( type: AvNodeType, nodeId: number ): AvNode
	{
		//console.log( `creating ${ AvNodeType[ type] } ${ nodeId }` );
		let obj:AvNode =
		{
			type: type,
			id: nodeId,
			flags: this.getNodeFlags(),
		};

		obj.persistentName = this.baseProps.debugName ?? this.baseProps.persistentName;

		return obj;
	}

	private get baseProps()
	{
		return this.props as AvBaseNodeProps;
	}

	public isVisible(): boolean
	{
		if( !this.baseProps || this.baseProps.visible == undefined )
			return true;

		return this.baseProps.visible;
	}

	protected getNodeFlags(): ENodeFlags
	{
		let flags:ENodeFlags = 0;
		if( this.isVisible() )
		{
			flags |= ENodeFlags.Visible;
		}

		return flags;
	}


	/** @hidden */
	public baseNodeRender( node: IAvBaseNode, children: React.ReactNode )
	{
		return (
			<av-node key={this.m_nodeId} nodeId={ this.m_nodeId } id={ this.baseProps.id }>
				{ children }
			</av-node>
		) ;
	}

	/** @hidden */
	public componentDidUpdate()
	{
		AvGadget.instance().markDirty();
	}

	public endpointAddr(): EndpointAddr
	{
		return {
			type: EndpointType.Node,
			endpointId: AvGadget.instance().getEndpointId(),
			nodeId: this.m_nodeId,
		}
	}

	/** @hidden */
	public render()
	{
		let persistentName = this.baseProps?.persistentName;
		if( persistentName && persistentName.startsWith( "_" ) )
		{
			throw new Error( "Persistent names that start with underscore are reserved" );
		}

		return this.baseNodeRender( this, this.props.children );
	}
	
}


